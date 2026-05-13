from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from requests import HTTPError, RequestException

from .models import PaymentSession, SubscriptionHistory
from .serializers import CreateCheckoutSerializer, CancelSubscriptionSerializer

from .security import verify_bog_webhook_signature, verify_fastoo_webhook_signature
from .services import (
    create_bog_checkout_session,
    create_fastoo_checkout_session,
    create_stub_checkout_session,
    get_subscription_status_payload,
    process_payment_return,
    process_gateway_webhook,
    is_stub_mode,
    start_pro_trial,
    cancel_user_trial,
)

class SubscriptionStatusAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(get_subscription_status_payload(request.user), status=status.HTTP_200_OK)


class CreateCheckoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateCheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            if is_stub_mode():
                row = create_stub_checkout_session(
                    user=request.user,
                    plan=data["plan"],
                    gateway=data["gateway"],
                )
            elif data["gateway"] == PaymentSession.Gateway.BOG:
                row = create_bog_checkout_session(
                    user=request.user,
                    plan=data["plan"],
                )
            elif data["gateway"] == PaymentSession.Gateway.FASTOO:
                row = create_fastoo_checkout_session(
                    user=request.user,
                    plan=data["plan"],
                )
        except (RuntimeError, RequestException) as exc:
            return Response(
                {"detail": "Failed to create checkout session.", "error": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                "detail": "Checkout session created.",
                "order_id": row.order_id,
                "payment_url": row.payment_url,
                "gateway": row.gateway,
                "plan": row.plan,
                "amount_gel": str(row.amount_gel),
                "stub": row.response_payload.get("stub", False),
            },
            status=status.HTTP_201_CREATED,
        )


class PaymentSuccessAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        order_id = request.query_params.get("order_id")
        if not order_id:
            return Response({"detail": "order_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        row = PaymentSession.objects.filter(order_id=order_id).first()
        if not row:
            return Response({"detail": "Payment session not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            result = process_payment_return(row)
        except (RuntimeError, RequestException, HTTPError) as exc:
            return Response(
                {"detail": "Failed to verify payment.", "error": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        row.refresh_from_db()

        return Response(
            {
                "detail": result["detail"],
                "order_id": row.order_id,
                "status": row.status,
                "plan": row.plan,
                "gateway": row.gateway,
                "already_processed": (not result["changed"]),
                "stub": row.response_payload.get("stub", False),
            },
            status=status.HTTP_200_OK,
        )


class PaymentCancelAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        order_id = request.query_params.get("order_id")
        if not order_id:
            return Response({"detail": "order_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        row = PaymentSession.objects.filter(order_id=order_id).first()
        if not row:
            return Response({"detail": "Payment session not found."}, status=status.HTTP_404_NOT_FOUND)

        if row.status == PaymentSession.Status.PENDING:
            row.status = PaymentSession.Status.CANCELED
            row.save(update_fields=["status", "updated_at"])

            SubscriptionHistory.objects.create(
                user=row.user,
                event_type=SubscriptionHistory.EventType.CANCELED,
                from_tier=row.user.subscription_tier,
                to_tier=row.user.subscription_tier,
                payment_session=row,
                metadata={"order_id": row.order_id, "stub": row.response_payload.get("stub", False)},
            )

        return Response(
            {
                "detail": "Payment canceled.",
                "order_id": row.order_id,
                "status": row.status,
                "stub": row.response_payload.get("stub", False),
            },
            status=status.HTTP_200_OK,
        )


class BOGWebhookAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        if not verify_bog_webhook_signature(request):
            return Response({"detail": "Invalid BOG webhook signature."}, status=status.HTTP_400_BAD_REQUEST)

        payload = request.data if isinstance(request.data, dict) else {}
        order_id = payload.get("order_id") or payload.get("external_order_id") or payload.get("merchant_order_id")

        if not order_id:
            return Response({"detail": "order_id missing in webhook payload."}, status=status.HTTP_400_BAD_REQUEST)

        row = PaymentSession.objects.filter(order_id=order_id).first()
        if not row:
            return Response({"detail": "Payment session not found."}, status=status.HTTP_404_NOT_FOUND)

        # Log payload
        row.webhook_payload = payload
        row.save(update_fields=["webhook_payload", "updated_at"])

        changed = process_gateway_webhook(row, payload=payload, source="bog_webhook")
        row.refresh_from_db()

        return Response(
            {
                "detail": "BOG webhook processed.",
                "order_id": row.order_id,
                "already_processed": (not changed),
                "stub": row.response_payload.get("stub", False),
            },
            status=status.HTTP_200_OK,
        )


class FastooWebhookAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        if not verify_fastoo_webhook_signature(request):
            return Response({"detail": "Invalid Fastoo webhook signature."}, status=status.HTTP_400_BAD_REQUEST)

        payload = request.data if isinstance(request.data, dict) else {}
        order_id = payload.get("order_id") or payload.get("external_order_id") or payload.get("merchant_order_id")

        if not order_id:
            return Response({"detail": "order_id missing in webhook payload."}, status=status.HTTP_400_BAD_REQUEST)

        row = PaymentSession.objects.filter(order_id=order_id).first()
        if not row:
            return Response({"detail": "Payment session not found."}, status=status.HTTP_404_NOT_FOUND)

        # Log payload
        row.webhook_payload = payload
        row.save(update_fields=["webhook_payload", "updated_at"])

        changed = process_gateway_webhook(row, payload=payload, source="fastoo_webhook")
        row.refresh_from_db()

        return Response(
            {
                "detail": "Fastoo webhook processed.",
                "order_id": row.order_id,
                "already_processed": (not changed),
                "stub": row.response_payload.get("stub", False),
            },
            status=status.HTTP_200_OK,
        )

class StartProTrialAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            start_pro_trial(request.user)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        request.user.refresh_from_db()
        return Response(
            {
                "detail": "Your 7-day Pro trial has started.",
                "status": get_subscription_status_payload(request.user),
            },
            status=status.HTTP_200_OK,
        )


class CancelTrialAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        canceled = cancel_user_trial(request.user)
        if not canceled:
            return Response(
                {"detail": "No active trial to cancel."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.refresh_from_db()
        return Response(
            {
                "detail": "Trial canceled. You have been returned to the free plan.",
                "status": get_subscription_status_payload(request.user),
            },
            status=status.HTTP_200_OK,
        )


class CancelSubscriptionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CancelSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user

        # If already free (and no active trial/pro), there may be nothing to cancel.
        effective_tier = user.effective_tier() if hasattr(user, "effective_tier") else user.subscription_tier
        if effective_tier == "free" and user.subscription_tier == "free":
            return Response(
                {
                    "detail": "No active paid subscription to cancel.",
                    "status": get_subscription_status_payload(user),
                },
                status=status.HTTP_200_OK,
            )

        # Stub behavior: mark cancel at period end
        user.subscription_cancel_at_period_end = True
        user.save(update_fields=["subscription_cancel_at_period_end", "updated_at"])

        SubscriptionHistory.objects.create(
            user=user,
            event_type=SubscriptionHistory.EventType.CANCELED,
            from_tier=user.subscription_tier,
            to_tier=user.subscription_tier,
            metadata={"cancel_at_period_end": True, "stub": True},
        )

        return Response(
            {
                "detail": "Subscription will cancel at period end.",
                "status": get_subscription_status_payload(user),
                "stub": True,
            },
            status=status.HTTP_200_OK,
        )
