from django.urls import path
from .views import (
    SubscriptionStatusAPIView,
    CreateCheckoutAPIView,
    PaymentSuccessAPIView,
    PaymentCancelAPIView,
    BOGWebhookAPIView,
    FastooWebhookAPIView,
    CancelSubscriptionAPIView,
)

urlpatterns = [
    path("subscriptions/status/", SubscriptionStatusAPIView.as_view(), name="subscriptions_status"),
    path("subscriptions/create-checkout/", CreateCheckoutAPIView.as_view(), name="subscriptions_create_checkout"),
    path("subscriptions/cancel/", CancelSubscriptionAPIView.as_view(), name="subscriptions_cancel"),
    path("subscriptions/payment-success/", PaymentSuccessAPIView.as_view(), name="subscriptions_payment_success"),
    path("subscriptions/payment-cancel/", PaymentCancelAPIView.as_view(), name="subscriptions_payment_cancel"),
    path("webhooks/bog/", BOGWebhookAPIView.as_view(), name="webhook_bog"),
    path("webhooks/fastoo/", FastooWebhookAPIView.as_view(), name="webhook_fastoo"),
]