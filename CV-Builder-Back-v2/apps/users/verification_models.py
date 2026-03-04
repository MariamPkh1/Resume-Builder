import uuid
from datetime import timedelta
from django.conf import settings
from django.db import models
from django.utils import timezone



class UserActionCode(models.Model):
    class Purpose(models.TextChoices):
        VERIFY_EMAIL = "verify_email", "Verify Email"
        RESET_PASSWORD = "reset_password", "Reset Password"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="action_codes")
    email = models.EmailField()
    purpose = models.CharField(max_length=30, choices=Purpose.choices)

    code = models.CharField(max_length=10)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email", "purpose", "-created_at"]),
            models.Index(fields=["user", "purpose", "-created_at"]),
        ]

    @property
    def is_used(self):
        return self.used_at is not None

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    def mark_used(self):
        self.used_at = timezone.now()
        self.save(update_fields=["used_at"])

    @classmethod
    def default_expiry(cls, minutes=15):
        return timezone.now() + timedelta(minutes=minutes)