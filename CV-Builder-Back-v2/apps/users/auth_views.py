from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .verification_models import UserActionCode

from django.db import transaction

from .services import (
    issue_user_action_code,
    send_verification_code_email,
    send_password_reset_code_email,
)

from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from django.conf import settings

from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from rest_framework.permissions import IsAuthenticated
from .serializers import (
    RegisterSerializer,
    VerifyEmailSerializer,
    LoginSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    GoogleAuthSerializer,
    MeSerializer,
    MeUpdateSerializer,
    LogoutSerializer,
)

from django.utils import timezone
from datetime import timedelta

from apps.subscriptions.models import SubscriptionHistory

User = get_user_model()

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


def build_auth_response(user, message=None, extra_user_data=None):
    user_data = MeSerializer(user).data
    if extra_user_data:
        user_data.update(extra_user_data)

    payload = {
        "user": user_data,
        "tokens": get_tokens_for_user(user),
    }
    if message:
        payload["message"] = message
    return payload

class MeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = MeUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MeSerializer(request.user).data, status=status.HTTP_200_OK)
class RegisterAPIView(APIView):
    authentication_classes = []  # public
    permission_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            with transaction.atomic():
                trial_ends_at = timezone.now() + timedelta(days=7)

                user = User.objects.create_user(
                    email=data["email"],
                    password=data["password"],
                    full_name=data.get("full_name", ""),
                    is_active=True,
                    email_verified=False,
                    subscription_tier="free",  # base tier remains free
                    trial_ends_at=trial_ends_at,  # effective tier becomes pro during trial
                )

                code_row = issue_user_action_code(
                    user=user,
                    purpose=UserActionCode.Purpose.VERIFY_EMAIL,
                    expiry_minutes=15,
                )

                send_verification_code_email(user.email, code_row.code)

                SubscriptionHistory.objects.create(
                    user=user,
                    event_type=SubscriptionHistory.EventType.TRIAL_STARTED,
                    from_tier="free",
                    to_tier="pro",
                    metadata={
                        "trial_days": 7,
                        "trial_ends_at": trial_ends_at.isoformat(),
                    },
                )

        except Exception as e:
            return Response(
                {
                    "detail": "Registration failed.",
                    "error": str(e),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            build_auth_response(
                user,
                message="Registration successful. 7-day Pro trial activated!",
            ),
            status=status.HTTP_201_CREATED,
        )


class LoginAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = authenticate(request=request, username=data["email"], password=data["password"])
        if user is None:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({"error": "Account is inactive"}, status=status.HTTP_401_UNAUTHORIZED)

        return Response(build_auth_response(user), status=status.HTTP_200_OK)

class VerifyEmailAPIView(APIView):
    authentication_classes = []  # public
    permission_classes = []

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            user = User.objects.get(email__iexact=data["email"])
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        code_row = (
            UserActionCode.objects
            .filter(
                user=user,
                email__iexact=user.email,
                purpose=UserActionCode.Purpose.VERIFY_EMAIL,
                used_at__isnull=True,
            )
            .order_by("-created_at")
            .first()
        )

        if not code_row:
            return Response({"detail": "No verification code found."}, status=status.HTTP_400_BAD_REQUEST)

        if code_row.is_expired:
            return Response({"detail": "Verification code expired."}, status=status.HTTP_400_BAD_REQUEST)

        if code_row.code != data["code"]:
            return Response({"detail": "Invalid verification code."}, status=status.HTTP_400_BAD_REQUEST)

        code_row.mark_used()

        # mark verified + activate
        user.email_verified = True
        user.is_active = True
        user.save(update_fields=["email_verified", "is_active"])

        return Response(
            build_auth_response(
                user,
                message="Email verified successfully.",
            ),
            status=status.HTTP_200_OK,
        )

class ForgotPasswordAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Generic response to avoid user enumeration
        generic_response = {
            "detail": "If an account with that email exists, a reset code has been sent."
        }

        user = User.objects.filter(email__iexact=data["email"]).first()
        if not user:
            return Response(generic_response, status=status.HTTP_200_OK)

        try:
            with transaction.atomic():
                code_row = issue_user_action_code(
                    user=user,
                    purpose=UserActionCode.Purpose.RESET_PASSWORD,
                    expiry_minutes=15,
                )
                send_password_reset_code_email(user.email, code_row.code)
        except Exception as e:
            return Response(
                {
                    "detail": "Failed to send reset code.",
                    "error": str(e),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(generic_response, status=status.HTTP_200_OK)


class ResetPasswordAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = User.objects.filter(email__iexact=data["email"]).first()
        if not user:
            return Response({"detail": "Invalid email or code."}, status=status.HTTP_400_BAD_REQUEST)

        code_row = (
            UserActionCode.objects
            .filter(
                user=user,
                email__iexact=user.email,
                purpose=UserActionCode.Purpose.RESET_PASSWORD,
                used_at__isnull=True,
            )
            .order_by("-created_at")
            .first()
        )

        if not code_row:
            return Response({"detail": "Invalid email or code."}, status=status.HTTP_400_BAD_REQUEST)

        if code_row.is_expired:
            return Response({"detail": "Reset code expired."}, status=status.HTTP_400_BAD_REQUEST)

        if code_row.code != data["code"]:
            return Response({"detail": "Invalid email or code."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            user.set_password(data["new_password"])
            # Optional: activate account on password reset if needed
            # user.is_active = True
            user.save(update_fields=["password"])
            code_row.mark_used()

        return Response(
            {"detail": "Password reset successful."},
            status=status.HTTP_200_OK,
        )

class GoogleAuthAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data["id_token"]

        if not getattr(settings, "GOOGLE_CLIENT_ID", ""):
            return Response(
                {"detail": "GOOGLE_CLIENT_ID is not configured."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            idinfo = google_id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
        except Exception as e:
            return Response(
                {
                    "detail": "Invalid Google ID token.",
                    "error": str(e),  # remove in production
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Basic checks
        email = (idinfo.get("email") or "").lower()
        email_verified = idinfo.get("email_verified", False)
        full_name = idinfo.get("name", "") or ""
        google_sub = idinfo.get("sub", "")

        if not email:
            return Response({"detail": "Google account email not available."}, status=status.HTTP_400_BAD_REQUEST)

        if not email_verified:
            return Response({"detail": "Google email is not verified."}, status=status.HTTP_400_BAD_REQUEST)

        # Find or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "full_name": full_name,
                "is_active": True,
                "email_verified": True,
                "subscription_tier": "free",
            },
        )

        # If user exists, ensure verified/active fields are aligned
        updates = []
        if full_name and user.full_name != full_name:
            user.full_name = full_name
            updates.append("full_name")
        if not user.email_verified:
            user.email_verified = True
            updates.append("email_verified")
        if not user.is_active:
            user.is_active = True
            updates.append("is_active")

        # Optional: store Google subject later in a social accounts table
        # For now, we skip persistence of google_sub.

        if updates:
            user.save(update_fields=updates)

        return Response(
            build_auth_response(
                user,
                message="Google authentication successful.",
                extra_user_data={"created": created},
            ),
            status=status.HTTP_200_OK,
        )

class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refresh_token = serializer.validated_data["refresh"]

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response(
                {"detail": "Invalid or expired refresh token."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except AttributeError:
            return Response(
                {"detail": "Token blacklist is not enabled on the server."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"detail": "Logged out successfully."}, status=status.HTTP_200_OK)
