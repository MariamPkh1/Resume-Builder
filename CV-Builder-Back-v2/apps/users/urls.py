from django.urls import path
from .auth_views import (
    RegisterAPIView,
    VerifyEmailAPIView,
    ForgotPasswordAPIView,
    ResetPasswordAPIView,
    GoogleAuthAPIView,
    MeAPIView,
    LogoutAPIView,
)

urlpatterns = [
    path("auth/register/", RegisterAPIView.as_view(), name="auth_register"),
    path("auth/verify-email/", VerifyEmailAPIView.as_view(), name="auth_verify_email"),
    path("auth/forgot-password/", ForgotPasswordAPIView.as_view(), name="auth_forgot_password"),
    path("auth/reset-password/", ResetPasswordAPIView.as_view(), name="auth_reset_password"),
    path("auth/google/", GoogleAuthAPIView.as_view(), name="auth_google"),
    path("auth/me/", MeAPIView.as_view(), name="auth_me"),
    path("auth/logout/", LogoutAPIView.as_view(), name="auth_logout"),
]