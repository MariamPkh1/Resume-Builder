from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.verification_models import UserActionCode


User = get_user_model()


class AuthAPITests(APITestCase):
    def register_payload(self, **overrides):
        payload = {
            "email": "newuser@example.com",
            "password": "StrongPass123",
            "repeat_password": "StrongPass123",
            "full_name": "New User",
        }
        payload.update(overrides)
        return payload

    def create_verified_user(self, **overrides):
        data = {
            "email": "verified@example.com",
            "password": "StrongPass123",
            "full_name": "Verified User",
            "is_active": True,
            "email_verified": True,
        }
        data.update(overrides)
        user = User.objects.create_user(**data)
        return user

    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        return str(refresh)

    def test_register_creates_free_user_and_sends_verification_code(self):
        response = self.client.post("/api/auth/register/", self.register_payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="newuser@example.com")
        self.assertTrue(user.is_active)
        self.assertFalse(user.email_verified)
        self.assertEqual(user.subscription_tier, "free")
        self.assertEqual(user.effective_tier(), "free")
        self.assertIsNone(user.trial_ends_at)
        self.assertEqual(len(mail.outbox), 1)

        code_row = UserActionCode.objects.get(
            user=user,
            purpose=UserActionCode.Purpose.VERIFY_EMAIL,
        )
        self.assertEqual(response.data["user"]["email"], user.email)
        self.assertEqual(response.data["user"]["effective_tier"], "free")
        self.assertIn("tokens", response.data)
        self.assertIn("access", response.data["tokens"])
        self.assertIn("refresh", response.data["tokens"])
        self.assertIn(code_row.code, mail.outbox[0].body)

    def test_register_rejects_duplicate_email(self):
        self.create_verified_user(email="newuser@example.com")

        response = self.client.post("/api/auth/register/", self.register_payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_verify_email_activates_user(self):
        self.client.post("/api/auth/register/", self.register_payload(), format="json")
        user = User.objects.get(email="newuser@example.com")
        code_row = UserActionCode.objects.get(
            user=user,
            purpose=UserActionCode.Purpose.VERIFY_EMAIL,
        )

        response = self.client.post(
            "/api/auth/verify-email/",
            {"email": user.email, "code": code_row.code},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        code_row.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertTrue(user.email_verified)
        self.assertIsNotNone(code_row.used_at)
        self.assertEqual(response.data["user"]["email"], user.email)
        self.assertIn("tokens", response.data)

    def test_verify_email_rejects_wrong_code(self):
        self.client.post("/api/auth/register/", self.register_payload(), format="json")
        user = User.objects.get(email="newuser@example.com")

        response = self.client.post(
            "/api/auth/verify-email/",
            {"email": user.email, "code": "000000"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        user.refresh_from_db()
        self.assertFalse(user.email_verified)

    def test_token_obtain_pair_works_with_email_and_password(self):
        user = self.create_verified_user()

        response = self.client.post(
            "/api/auth/token/",
            {"email": user.email, "password": "StrongPass123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_returns_user_and_tokens(self):
        user = self.create_verified_user()

        response = self.client.post(
            "/api/auth/login/",
            {"email": user.email, "password": "StrongPass123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["email"], user.email)
        self.assertIn("tokens", response.data)
        self.assertIn("access", response.data["tokens"])
        self.assertIn("refresh", response.data["tokens"])

    def test_login_rejects_invalid_credentials(self):
        user = self.create_verified_user()

        response = self.client.post(
            "/api/auth/login/",
            {"email": user.email, "password": "WrongPass123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["error"], "Invalid credentials")

    def test_me_requires_authentication(self):
        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_user_details_and_limits(self):
        user = self.create_verified_user(preferred_language="ka")
        self.authenticate(user)

        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], user.email)
        self.assertEqual(response.data["preferred_language"], "ka")
        self.assertIn("limits", response.data)
        self.assertEqual(response.data["effective_tier"], "free")
        self.assertIn("ats_checks", response.data["limits"])
        self.assertEqual(response.data["limits"]["ats_checks"]["limit"], 0)

    def test_me_includes_unlimited_ats_quota_for_professional(self):
        user = self.create_verified_user(subscription_tier="professional")
        self.authenticate(user)

        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ats = response.data["limits"]["ats_checks"]
        self.assertEqual(ats["limit"], -1)
        self.assertEqual(ats["remaining"], -1)
        self.assertTrue(ats["allowed"])

    def test_me_includes_monthly_ats_quota_for_pro(self):
        user = self.create_verified_user(subscription_tier="pro")
        self.authenticate(user)

        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ats = response.data["limits"]["ats_checks"]
        self.assertEqual(ats["limit"], 20)
        self.assertEqual(ats["used"], 0)
        self.assertEqual(ats["remaining"], 20)

    def test_profile_alias_returns_same_user_details(self):
        user = self.create_verified_user(preferred_language="ka")
        self.authenticate(user)

        response = self.client.get("/api/auth/profile/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], user.email)
        self.assertEqual(response.data["preferred_language"], "ka")

    def test_me_patch_updates_allowed_profile_fields(self):
        user = self.create_verified_user()
        self.authenticate(user)

        response = self.client.patch(
            "/api/auth/me/",
            {"full_name": "Updated Name", "phone": "+995555000111", "preferred_language": "ka"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.full_name, "Updated Name")
        self.assertEqual(user.phone, "+995555000111")
        self.assertEqual(user.preferred_language, "ka")

    def test_forgot_password_creates_reset_code_for_existing_user(self):
        user = self.create_verified_user()

        response = self.client.post(
            "/api/auth/forgot-password/",
            {"email": user.email},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            UserActionCode.objects.filter(
                user=user,
                purpose=UserActionCode.Purpose.RESET_PASSWORD,
            ).count(),
            1,
        )
        self.assertEqual(len(mail.outbox), 1)

    def test_forgot_password_is_generic_for_unknown_email(self):
        response = self.client.post(
            "/api/auth/forgot-password/",
            {"email": "missing@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(UserActionCode.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 0)

    def test_reset_password_updates_password_and_marks_code_used(self):
        user = self.create_verified_user()
        self.client.post("/api/auth/forgot-password/", {"email": user.email}, format="json")
        code_row = UserActionCode.objects.get(
            user=user,
            purpose=UserActionCode.Purpose.RESET_PASSWORD,
        )

        response = self.client.post(
            "/api/auth/reset-password/",
            {
                "email": user.email,
                "code": code_row.code,
                "new_password": "NewStrongPass123",
                "repeat_password": "NewStrongPass123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        code_row.refresh_from_db()
        self.assertTrue(user.check_password("NewStrongPass123"))
        self.assertIsNotNone(code_row.used_at)

    def test_logout_blacklists_refresh_token(self):
        user = self.create_verified_user()
        refresh_token = self.authenticate(user)

        response = self.client.post(
            "/api/auth/logout/",
            {"refresh": refresh_token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        second_response = self.client.post(
            "/api/auth/logout/",
            {"refresh": refresh_token},
            format="json",
        )
        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
