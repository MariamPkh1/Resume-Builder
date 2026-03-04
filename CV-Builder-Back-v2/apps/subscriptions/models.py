import uuid
from django.conf import settings
from django.db import models


class PaymentSession(models.Model):
    class Gateway(models.TextChoices):
        BOG = "bog", "Bank of Georgia"
        FASTOO = "fastoo", "Fastoo"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"
        CANCELED = "canceled", "Canceled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payment_sessions")

    order_id = models.CharField(max_length=100, unique=True)
    gateway = models.CharField(max_length=20, choices=Gateway.choices)

    # plan chosen by user (e.g. "pro_monthly", "pro_yearly")
    plan = models.CharField(max_length=50)

    amount_gel = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="GEL")

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    gateway_session_id = models.CharField(max_length=255, blank=True, default="")
    payment_url = models.URLField(blank=True, default="")

    request_payload = models.JSONField(default=dict, blank=True)
    response_payload = models.JSONField(default=dict, blank=True)
    webhook_payload = models.JSONField(default=dict, blank=True)

    paid_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)  # optional for session expiry

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["order_id"]),
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.order_id} ({self.gateway}) - {self.status}"


class SubscriptionHistory(models.Model):
    class EventType(models.TextChoices):
        TRIAL_STARTED = "trial_started", "Trial Started"
        TRIAL_ENDED = "trial_ended", "Trial Ended"
        UPGRADED = "upgraded", "Upgraded"
        RENEWED = "renewed", "Renewed"
        DOWNGRADED = "downgraded", "Downgraded"
        CANCELED = "canceled", "Canceled"
        PAYMENT_CONFIRMED = "payment_confirmed", "Payment Confirmed"
        PAYMENT_FAILED = "payment_failed", "Payment Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subscription_history")

    event_type = models.CharField(max_length=50, choices=EventType.choices)
    from_tier = models.CharField(max_length=20, blank=True, default="")
    to_tier = models.CharField(max_length=20, blank=True, default="")

    payment_session = models.ForeignKey(
        PaymentSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="history_events",
    )

    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["event_type", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.user_id} - {self.event_type}"