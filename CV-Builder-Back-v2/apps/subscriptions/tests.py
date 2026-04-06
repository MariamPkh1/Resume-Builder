from django.contrib.auth import get_user_model
from unittest.mock import Mock, patch

from datetime import timedelta
from io import StringIO

from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

from apps.cvs.models import CV
from apps.subscriptions.models import PaymentSession, SubscriptionHistory
from apps.subscriptions.services import (
    expire_due_paid_subscriptions,
    expire_paid_subscription,
    expire_user_trial,
)


User = get_user_model()


class SubscriptionAPITests(APITestCase):
    def create_user(self, **overrides):
        data = {
            "email": "subscriber@example.com",
            "password": "StrongPass123",
            "full_name": "Subscriber User",
            "is_active": True,
            "email_verified": True,
        }
        data.update(overrides)
        return User.objects.create_user(**data)

    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def create_payment_session(self, user, **overrides):
        data = {
            "user": user,
            "order_id": "NEB-test-order",
            "gateway": PaymentSession.Gateway.BOG,
            "plan": "pro_monthly",
            "amount_gel": "29.99",
            "currency": "GEL",
            "status": PaymentSession.Status.PENDING,
            "gateway_session_id": "stub-session",
            "payment_url": "http://127.0.0.1:8000/api/subscriptions/payment-success/?order_id=NEB-test-order",
            "response_payload": {"stub": True},
        }
        data.update(overrides)
        return PaymentSession.objects.create(**data)

    def create_cv(self, user, **overrides):
        data = {
            "user": user,
            "title": "Resume",
            "cv_data": {"summary": "text"},
            "section_order": ["summary"],
            "language": "en",
            "template": "modern",
        }
        data.update(overrides)
        return CV.objects.create(**data)

    def test_subscription_status_requires_authentication(self):
        response = self.client.get("/api/subscriptions/status/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_subscription_status_returns_limits_and_trial_info(self):
        user = self.create_user(subscription_tier="free")
        self.authenticate(user)

        response = self.client.get("/api/subscriptions/status/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["subscription_tier"], "free")
        self.assertEqual(response.data["effective_tier"], "free")
        self.assertIn("limits", response.data)
        self.assertEqual(response.data["limits"]["max_cvs"], 2)

    def test_create_checkout_creates_pending_stub_session(self):
        user = self.create_user()
        self.authenticate(user)

        response = self.client.post(
            "/api/subscriptions/create-checkout/",
            {"plan": "pro_monthly", "gateway": "bog"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        row = PaymentSession.objects.get(order_id=response.data["order_id"])
        self.assertEqual(row.user_id, user.id)
        self.assertEqual(row.status, PaymentSession.Status.PENDING)
        self.assertEqual(row.gateway, PaymentSession.Gateway.BOG)
        self.assertEqual(row.plan, "pro_monthly")
        self.assertEqual(str(row.amount_gel), "29.99")
        self.assertEqual(response.data["stub"], True)

    def test_create_checkout_rejects_unsupported_plan(self):
        user = self.create_user()
        self.authenticate(user)

        response = self.client.post(
            "/api/subscriptions/create-checkout/",
            {"plan": "enterprise_monthly", "gateway": "bog"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("plan", response.data)

    def test_create_checkout_supports_professional_plans(self):
        user = self.create_user()
        self.authenticate(user)

        response = self.client.post(
            "/api/subscriptions/create-checkout/",
            {"plan": "professional_monthly", "gateway": "fastoo"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        row = PaymentSession.objects.get(order_id=response.data["order_id"])
        self.assertEqual(row.plan, "professional_monthly")
        self.assertEqual(row.gateway, PaymentSession.Gateway.FASTOO)
        self.assertEqual(str(row.amount_gel), "89.99")

    @override_settings(
        PAYMENT_STUB_MODE=False,
        FASTOO_PROJECT_ID="project-id",
        FASTOO_API_PASSWORD="secret",
        FASTOO_API_URL="https://api.fastoo.ge",
    )
    @patch("apps.subscriptions.services.requests.post")
    def test_create_checkout_uses_fastoo_provider_when_stub_mode_disabled(self, mock_post):
        user = self.create_user()
        self.authenticate(user)
        mock_response = Mock()
        mock_response.json.return_value = {
            "orders": [
                {
                    "id": "gateway-order-1",
                    "status": "new",
                }
            ]
        }
        mock_response.headers = {"Location": "https://pay.fastoo.example/order/1"}
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        response = self.client.post(
            "/api/subscriptions/create-checkout/",
            {"plan": "pro_monthly", "gateway": "fastoo"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        row = PaymentSession.objects.get(order_id=response.data["order_id"])
        self.assertEqual(row.gateway_session_id, "gateway-order-1")
        self.assertEqual(row.payment_url, "https://pay.fastoo.example/order/1")
        self.assertFalse(response.data["stub"])

    @override_settings(
        PAYMENT_STUB_MODE=False,
        BOG_CLIENT_ID="bog-client",
        BOG_CLIENT_SECRET="bog-secret",
        BOG_API_URL="https://api.bog.ge",
        BOG_OAUTH_URL="https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token",
    )
    @patch("apps.subscriptions.services.requests.post")
    def test_create_checkout_uses_bog_provider_when_stub_mode_disabled(self, mock_post):
        user = self.create_user()
        self.authenticate(user)

        oauth_response = Mock()
        oauth_response.json.return_value = {"access_token": "bog-token"}
        oauth_response.raise_for_status.return_value = None

        create_response = Mock()
        create_response.json.return_value = {
            "id": "bog-order-1",
            "_links": {
                "redirect": {"href": "https://payment.bog.ge/?order_id=bog-order-1"},
            },
        }
        create_response.raise_for_status.return_value = None

        mock_post.side_effect = [oauth_response, create_response]

        response = self.client.post(
            "/api/subscriptions/create-checkout/",
            {"plan": "pro_monthly", "gateway": "bog"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        row = PaymentSession.objects.get(order_id=response.data["order_id"])
        self.assertEqual(row.gateway_session_id, "bog-order-1")
        self.assertEqual(row.payment_url, "https://payment.bog.ge/?order_id=bog-order-1")
        self.assertFalse(response.data["stub"])

    def test_payment_success_marks_pending_payment_success_and_upgrades_user(self):
        user = self.create_user(subscription_tier="free")
        row = self.create_payment_session(user, order_id="NEB-success")

        response = self.client.get("/api/subscriptions/payment-success/?order_id=NEB-success")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row.refresh_from_db()
        user.refresh_from_db()
        self.assertEqual(row.status, PaymentSession.Status.SUCCESS)
        self.assertIsNotNone(row.paid_at)
        self.assertEqual(user.subscription_tier, "pro")
        self.assertEqual(
            SubscriptionHistory.objects.filter(
                user=user,
                event_type=SubscriptionHistory.EventType.PAYMENT_CONFIRMED,
            ).count(),
            1,
        )
        self.assertEqual(
            SubscriptionHistory.objects.filter(
                user=user,
                event_type=SubscriptionHistory.EventType.UPGRADED,
            ).count(),
            1,
        )

    def test_payment_success_renews_existing_paid_subscription(self):
        user = self.create_user(
            subscription_tier="pro",
            subscription_current_period_end=timezone.now() + timedelta(days=3),
        )
        row = self.create_payment_session(user, order_id="NEB-renew", status=PaymentSession.Status.PENDING)

        response = self.client.get("/api/subscriptions/payment-success/?order_id=NEB-renew")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row.refresh_from_db()
        user.refresh_from_db()
        self.assertEqual(row.status, PaymentSession.Status.SUCCESS)
        self.assertEqual(user.subscription_tier, "pro")
        self.assertGreater(user.subscription_current_period_end, timezone.now() + timedelta(days=20))
        self.assertEqual(
            SubscriptionHistory.objects.filter(
                user=user,
                event_type=SubscriptionHistory.EventType.RENEWED,
            ).count(),
            1,
        )

    def test_payment_success_is_idempotent(self):
        user = self.create_user(subscription_tier="free")
        self.create_payment_session(
            user,
            order_id="NEB-already-success",
            status=PaymentSession.Status.SUCCESS,
        )

        response = self.client.get("/api/subscriptions/payment-success/?order_id=NEB-already-success")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["already_processed"], True)
        self.assertEqual(SubscriptionHistory.objects.count(), 0)

    @override_settings(PAYMENT_STUB_MODE=False)
    def test_payment_success_does_not_activate_payment_when_stub_mode_is_disabled(self):
        user = self.create_user(subscription_tier="free")
        row = self.create_payment_session(
            user,
            order_id="NEB-return-only",
            response_payload={"stub": False},
        )

        response = self.client.get("/api/subscriptions/payment-success/?order_id=NEB-return-only")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row.refresh_from_db()
        user.refresh_from_db()
        self.assertEqual(row.status, PaymentSession.Status.PENDING)
        self.assertEqual(user.subscription_tier, "free")
        self.assertEqual(
            response.data["detail"],
            "Payment return received. Waiting for gateway confirmation.",
        )

    @override_settings(
        PAYMENT_STUB_MODE=False,
        FASTOO_PROJECT_ID="project-id",
        FASTOO_API_PASSWORD="secret",
        FASTOO_API_URL="https://api.fastoo.ge",
    )
    @patch("apps.subscriptions.services.requests.get")
    def test_payment_success_verifies_fastoo_order_when_stub_mode_disabled(self, mock_get):
        user = self.create_user(subscription_tier="free")
        row = self.create_payment_session(
            user,
            order_id="NEB-fastoo-return",
            gateway=PaymentSession.Gateway.FASTOO,
            gateway_session_id="gateway-fastoo-1",
            response_payload={"stub": False},
        )
        mock_response = Mock()
        mock_response.json.return_value = {
            "orders": [
                {
                    "id": "gateway-fastoo-1",
                    "status": "charged",
                }
            ]
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        response = self.client.get("/api/subscriptions/payment-success/?order_id=NEB-fastoo-return")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row.refresh_from_db()
        user.refresh_from_db()
        self.assertEqual(row.status, PaymentSession.Status.SUCCESS)
        self.assertEqual(user.subscription_tier, "pro")

    @override_settings(
        PAYMENT_STUB_MODE=False,
        BOG_CLIENT_ID="bog-client",
        BOG_CLIENT_SECRET="bog-secret",
        BOG_API_URL="https://api.bog.ge",
        BOG_OAUTH_URL="https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token",
    )
    @patch("apps.subscriptions.services.requests.get")
    @patch("apps.subscriptions.services.requests.post")
    def test_payment_success_verifies_bog_order_when_stub_mode_disabled(self, mock_post, mock_get):
        user = self.create_user(subscription_tier="free")
        row = self.create_payment_session(
            user,
            order_id="NEB-bog-return",
            gateway=PaymentSession.Gateway.BOG,
            gateway_session_id="bog-gateway-1",
            response_payload={"stub": False},
        )

        oauth_response = Mock()
        oauth_response.json.return_value = {"access_token": "bog-token"}
        oauth_response.raise_for_status.return_value = None
        mock_post.return_value = oauth_response

        receipt_response = Mock()
        receipt_response.json.return_value = {
            "order_id": "bog-gateway-1",
            "order_status": {"key": "completed"},
        }
        receipt_response.raise_for_status.return_value = None
        mock_get.return_value = receipt_response

        response = self.client.get("/api/subscriptions/payment-success/?order_id=NEB-bog-return")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row.refresh_from_db()
        user.refresh_from_db()
        self.assertEqual(row.status, PaymentSession.Status.SUCCESS)
        self.assertEqual(user.subscription_tier, "pro")

    def test_payment_cancel_marks_pending_payment_canceled(self):
        user = self.create_user()
        row = self.create_payment_session(user, order_id="NEB-cancel")

        response = self.client.get("/api/subscriptions/payment-cancel/?order_id=NEB-cancel")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row.refresh_from_db()
        self.assertEqual(row.status, PaymentSession.Status.CANCELED)
        self.assertEqual(
            SubscriptionHistory.objects.filter(
                user=user,
                event_type=SubscriptionHistory.EventType.CANCELED,
                payment_session=row,
            ).count(),
            1,
        )

    def test_bog_webhook_processes_pending_payment_without_auth(self):
        user = self.create_user(subscription_tier="free")
        row = self.create_payment_session(user, order_id="NEB-bog-webhook")

        response = self.client.post(
            "/api/webhooks/bog/",
            {"order_id": "NEB-bog-webhook", "status": "success"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row.refresh_from_db()
        user.refresh_from_db()
        self.assertEqual(row.status, PaymentSession.Status.SUCCESS)
        self.assertEqual(row.webhook_payload["order_id"], "NEB-bog-webhook")
        self.assertEqual(user.subscription_tier, "pro")

    def test_fastoo_webhook_processes_pending_payment_without_auth(self):
        user = self.create_user(subscription_tier="free")
        row = self.create_payment_session(
            user,
            order_id="NEB-fastoo-webhook",
            gateway=PaymentSession.Gateway.FASTOO,
        )

        response = self.client.post(
            "/api/webhooks/fastoo/",
            {"order_id": "NEB-fastoo-webhook", "status": "success"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row.refresh_from_db()
        user.refresh_from_db()
        self.assertEqual(row.status, PaymentSession.Status.SUCCESS)
        self.assertEqual(row.webhook_payload["order_id"], "NEB-fastoo-webhook")
        self.assertEqual(user.subscription_tier, "pro")

    def test_fastoo_webhook_marks_failed_payment(self):
        user = self.create_user(subscription_tier="pro")
        row = self.create_payment_session(
            user,
            order_id="NEB-fastoo-failed",
            gateway=PaymentSession.Gateway.FASTOO,
            status=PaymentSession.Status.PENDING,
        )

        response = self.client.post(
            "/api/webhooks/fastoo/",
            {"order_id": "NEB-fastoo-failed", "status": "failed"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row.refresh_from_db()
        self.assertEqual(row.status, PaymentSession.Status.FAILED)
        self.assertEqual(
            SubscriptionHistory.objects.filter(
                user=user,
                event_type=SubscriptionHistory.EventType.PAYMENT_FAILED,
                payment_session=row,
            ).count(),
            1,
        )

    @override_settings(PAYMENT_STUB_MODE=False, FASTOO_WEBHOOK_SECRET="fastoo-secret")
    def test_fastoo_webhook_requires_valid_signature_when_stub_mode_disabled(self):
        user = self.create_user(subscription_tier="free")
        row = self.create_payment_session(
            user,
            order_id="NEB-fastoo-signed",
            gateway=PaymentSession.Gateway.FASTOO,
            response_payload={"stub": False},
        )

        invalid_response = self.client.post(
            "/api/webhooks/fastoo/",
            {"order_id": "NEB-fastoo-signed", "status": "success"},
            format="json",
        )
        self.assertEqual(invalid_response.status_code, status.HTTP_400_BAD_REQUEST)

        import hashlib
        import hmac
        import json

        body = json.dumps({"order_id": "NEB-fastoo-signed", "status": "success"}).encode("utf-8")
        signature = hmac.new(b"fastoo-secret", body, hashlib.sha256).hexdigest()
        valid_response = self.client.generic(
            "POST",
            "/api/webhooks/fastoo/",
            body,
            content_type="application/json",
            HTTP_X_FASTOO_SIGNATURE=signature,
        )

        self.assertEqual(valid_response.status_code, status.HTTP_200_OK)
        row.refresh_from_db()
        self.assertEqual(row.status, PaymentSession.Status.SUCCESS)

    @override_settings(PAYMENT_STUB_MODE=False)
    def test_bog_webhook_requires_valid_signature_when_stub_mode_disabled(self):
        user = self.create_user(subscription_tier="free")
        row = self.create_payment_session(
            user,
            order_id="NEB-bog-signed",
            response_payload={"stub": False},
        )

        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        public_key_pem = private_key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        ).decode("utf-8")

        invalid_response = self.client.post(
            "/api/webhooks/bog/",
            {"order_id": "NEB-bog-signed", "status": "success"},
            format="json",
        )
        self.assertEqual(invalid_response.status_code, status.HTTP_400_BAD_REQUEST)

        import json

        body = json.dumps({"order_id": "NEB-bog-signed", "status": "success"}).encode("utf-8")
        signature = private_key.sign(body, padding.PKCS1v15(), hashes.SHA256()).hex()
        with override_settings(BOG_CALLBACK_PUBLIC_KEY=public_key_pem):
            valid_response = self.client.generic(
                "POST",
                "/api/webhooks/bog/",
                body,
                content_type="application/json",
                HTTP_CALLBACK_SIGNATURE=signature,
            )

        self.assertEqual(valid_response.status_code, status.HTTP_200_OK)
        row.refresh_from_db()
        self.assertEqual(row.status, PaymentSession.Status.SUCCESS)

    def test_webhook_replay_is_idempotent_after_success(self):
        user = self.create_user(subscription_tier="free")
        row = self.create_payment_session(user, order_id="NEB-replay")

        first_response = self.client.post(
            "/api/webhooks/bog/",
            {"order_id": "NEB-replay", "status": "success"},
            format="json",
        )
        second_response = self.client.post(
            "/api/webhooks/bog/",
            {"order_id": "NEB-replay", "status": "success"},
            format="json",
        )

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertTrue(second_response.data["already_processed"])
        self.assertEqual(
            SubscriptionHistory.objects.filter(
                user=user,
                event_type=SubscriptionHistory.EventType.PAYMENT_CONFIRMED,
            ).count(),
            1,
        )

    def test_webhook_rejects_missing_order_id(self):
        response = self.client.post(
            "/api/webhooks/fastoo/",
            {"status": "success"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "order_id missing in webhook payload.")

    @override_settings(
        PAYMENT_STUB_MODE=False,
        FASTOO_PROJECT_ID="project-id",
        FASTOO_API_PASSWORD="secret",
        FASTOO_API_URL="https://api.fastoo.ge",
    )
    @patch("apps.subscriptions.services.requests.get")
    def test_payment_success_marks_fastoo_refund_as_failed(self, mock_get):
        user = self.create_user(subscription_tier="pro")
        row = self.create_payment_session(
            user,
            order_id="NEB-fastoo-refunded",
            gateway=PaymentSession.Gateway.FASTOO,
            gateway_session_id="gateway-fastoo-refunded",
            response_payload={"stub": False},
        )
        mock_response = Mock()
        mock_response.json.return_value = {
            "orders": [
                {
                    "id": "gateway-fastoo-refunded",
                    "status": "refunded",
                }
            ]
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        response = self.client.get("/api/subscriptions/payment-success/?order_id=NEB-fastoo-refunded")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row.refresh_from_db()
        self.assertEqual(row.status, PaymentSession.Status.FAILED)
        self.assertEqual(
            SubscriptionHistory.objects.filter(
                user=user,
                event_type=SubscriptionHistory.EventType.PAYMENT_FAILED,
                payment_session=row,
            ).count(),
            1,
        )

    @override_settings(
        PAYMENT_STUB_MODE=False,
        BOG_CLIENT_ID="bog-client",
        BOG_CLIENT_SECRET="bog-secret",
        BOG_API_URL="https://api.bog.ge",
        BOG_OAUTH_URL="https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token",
    )
    @patch("apps.subscriptions.services.requests.get")
    @patch("apps.subscriptions.services.requests.post")
    def test_payment_success_marks_bog_rejection_as_failed(self, mock_post, mock_get):
        user = self.create_user(subscription_tier="pro")
        row = self.create_payment_session(
            user,
            order_id="NEB-bog-rejected",
            gateway=PaymentSession.Gateway.BOG,
            gateway_session_id="bog-gateway-rejected",
            response_payload={"stub": False},
        )

        oauth_response = Mock()
        oauth_response.json.return_value = {"access_token": "bog-token"}
        oauth_response.raise_for_status.return_value = None
        mock_post.return_value = oauth_response

        receipt_response = Mock()
        receipt_response.json.return_value = {
            "order_id": "bog-gateway-rejected",
            "order_status": {"key": "rejected"},
        }
        receipt_response.raise_for_status.return_value = None
        mock_get.return_value = receipt_response

        response = self.client.get("/api/subscriptions/payment-success/?order_id=NEB-bog-rejected")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row.refresh_from_db()
        self.assertEqual(row.status, PaymentSession.Status.FAILED)
        self.assertEqual(
            SubscriptionHistory.objects.filter(
                user=user,
                event_type=SubscriptionHistory.EventType.PAYMENT_FAILED,
                payment_session=row,
            ).count(),
            1,
        )

    def test_expire_user_trial_archives_excess_cvs_for_free_user(self):
        expired_at = timezone.now() - timedelta(days=1)
        user = self.create_user(subscription_tier="free", trial_ends_at=expired_at)
        newest = self.create_cv(user, title="Newest")
        middle = self.create_cv(user, title="Middle")
        oldest = self.create_cv(user, title="Oldest")
        CV.objects.filter(id=oldest.id).update(updated_at=timezone.now() - timedelta(days=3))
        CV.objects.filter(id=middle.id).update(updated_at=timezone.now() - timedelta(days=2))
        CV.objects.filter(id=newest.id).update(updated_at=timezone.now() - timedelta(days=1))

        changed = expire_user_trial(user)

        self.assertTrue(changed)
        user.refresh_from_db()
        newest.refresh_from_db()
        middle.refresh_from_db()
        oldest.refresh_from_db()
        self.assertIsNone(user.trial_ends_at)
        self.assertFalse(newest.is_archived)
        self.assertTrue(middle.is_archived)
        self.assertTrue(oldest.is_archived)
        self.assertEqual(
            SubscriptionHistory.objects.filter(
                user=user,
                event_type=SubscriptionHistory.EventType.TRIAL_ENDED,
            ).count(),
            1,
        )
        self.assertEqual(
            SubscriptionHistory.objects.filter(
                user=user,
                event_type=SubscriptionHistory.EventType.DOWNGRADED,
            ).count(),
            1,
        )

    def test_expire_user_trial_keeps_paid_user_cvs_active(self):
        expired_at = timezone.now() - timedelta(days=1)
        user = self.create_user(subscription_tier="pro", trial_ends_at=expired_at)
        first = self.create_cv(user, title="First")
        second = self.create_cv(user, title="Second")

        changed = expire_user_trial(user)

        self.assertTrue(changed)
        user.refresh_from_db()
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertIsNone(user.trial_ends_at)
        self.assertFalse(first.is_archived)
        self.assertFalse(second.is_archived)
        self.assertEqual(
            SubscriptionHistory.objects.filter(
                user=user,
                event_type=SubscriptionHistory.EventType.DOWNGRADED,
            ).count(),
            0,
        )

    def test_expire_trials_command_processes_expired_trials(self):
        expired_at = timezone.now() - timedelta(hours=1)
        user = self.create_user(subscription_tier="free", trial_ends_at=expired_at)
        self.create_cv(user, title="CV 1")
        self.create_cv(user, title="CV 2")
        output = StringIO()

        call_command("expire_trials", stdout=output)

        user.refresh_from_db()
        self.assertIsNone(user.trial_ends_at)
        self.assertIn("Expired trials processed: 1", output.getvalue())
        self.assertEqual(CV.objects.filter(user=user, is_archived=False).count(), 1)

    def test_cancel_subscription_marks_cancel_at_period_end_for_paid_user(self):
        user = self.create_user(subscription_tier="pro")
        self.authenticate(user)

        response = self.client.post(
            "/api/subscriptions/cancel/",
            {"confirm": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.subscription_cancel_at_period_end)
        self.assertEqual(
            SubscriptionHistory.objects.filter(
                user=user,
                event_type=SubscriptionHistory.EventType.CANCELED,
            ).count(),
            1,
        )

    def test_expire_paid_subscription_downgrades_user_at_period_end(self):
        expired_at = timezone.now() - timedelta(hours=1)
        user = self.create_user(
            subscription_tier="pro",
            subscription_current_period_end=expired_at,
            subscription_cancel_at_period_end=True,
        )
        active_one = self.create_cv(user, title="CV 1")
        active_two = self.create_cv(user, title="CV 2")
        archived_candidate = self.create_cv(user, title="CV 3")
        CV.objects.filter(id=archived_candidate.id).update(updated_at=timezone.now() - timedelta(days=2))

        changed = expire_paid_subscription(user, now=timezone.now(), reason="cancel_at_period_end")

        self.assertTrue(changed)
        user.refresh_from_db()
        active_one.refresh_from_db()
        active_two.refresh_from_db()
        archived_candidate.refresh_from_db()
        self.assertEqual(user.subscription_tier, "free")
        self.assertFalse(user.subscription_cancel_at_period_end)
        self.assertIsNone(user.subscription_current_period_end)
        self.assertFalse(active_one.is_archived)
        self.assertFalse(active_two.is_archived)
        self.assertTrue(archived_candidate.is_archived)
        self.assertEqual(
            SubscriptionHistory.objects.filter(
                user=user,
                event_type=SubscriptionHistory.EventType.DOWNGRADED,
            ).count(),
            1,
        )

    def test_failed_renewal_downgrades_user_after_period_end(self):
        expired_at = timezone.now() - timedelta(hours=2)
        user = self.create_user(
            subscription_tier="pro",
            subscription_current_period_end=expired_at,
        )
        self.create_cv(user, title="CV 1")
        self.create_cv(user, title="CV 2")
        self.create_cv(user, title="CV 3")
        row = self.create_payment_session(
            user,
            order_id="NEB-renewal-failed",
            status=PaymentSession.Status.PENDING,
        )

        response = self.client.post(
            "/api/webhooks/bog/",
            {"order_id": "NEB-renewal-failed", "status": "rejected"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row.refresh_from_db()
        user.refresh_from_db()
        self.assertEqual(row.status, PaymentSession.Status.FAILED)
        self.assertEqual(user.subscription_tier, "free")
        self.assertEqual(CV.objects.filter(user=user, is_archived=False).count(), 2)
        self.assertEqual(
            SubscriptionHistory.objects.filter(
                user=user,
                event_type=SubscriptionHistory.EventType.PAYMENT_FAILED,
                payment_session=row,
            ).count(),
            1,
        )

    def test_expire_due_paid_subscriptions_processes_overdue_users(self):
        expired_at = timezone.now() - timedelta(hours=1)
        user = self.create_user(
            subscription_tier="professional",
            subscription_current_period_end=expired_at,
            subscription_cancel_at_period_end=True,
        )

        processed = expire_due_paid_subscriptions()

        self.assertEqual(processed, 1)
        user.refresh_from_db()
        self.assertEqual(user.subscription_tier, "free")

    def test_expire_paid_subscriptions_command_processes_due_subscriptions(self):
        expired_at = timezone.now() - timedelta(hours=1)
        user = self.create_user(
            subscription_tier="pro",
            subscription_current_period_end=expired_at,
            subscription_cancel_at_period_end=True,
        )
        output = StringIO()

        call_command("expire_paid_subscriptions", stdout=output)

        user.refresh_from_db()
        self.assertEqual(user.subscription_tier, "free")
        self.assertIn("Expired paid subscriptions processed: 1", output.getvalue())

    def test_cancel_subscription_returns_noop_for_free_user(self):
        user = self.create_user(subscription_tier="free")
        self.authenticate(user)

        response = self.client.post(
            "/api/subscriptions/cancel/",
            {"confirm": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "No active paid subscription to cancel.")
        self.assertEqual(SubscriptionHistory.objects.count(), 0)

    def test_subscription_status_includes_latest_payment(self):
        user = self.create_user(subscription_tier="pro")
        self.create_payment_session(
            user,
            order_id="NEB-latest-payment",
            status=PaymentSession.Status.SUCCESS,
        )
        self.authenticate(user)

        response = self.client.get("/api/subscriptions/status/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("latest_payment", response.data)
        self.assertEqual(response.data["latest_payment"]["order_id"], "NEB-latest-payment")
