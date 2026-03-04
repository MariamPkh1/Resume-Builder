import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class PreferredLanguage(models.TextChoices):
        EN = "en", "English"
        KA = "ka", "Georgian"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    email = models.EmailField(unique=True)
    email_verified = models.BooleanField(default=False)
    full_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    preferred_language = models.CharField(
        max_length=10,
        choices=PreferredLanguage.choices,
        default=PreferredLanguage.EN,
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    subscription_tier = models.CharField(
        max_length=20,
        choices=[
            ("free", "Free"),
            ("pro", "Pro"),
            ("professional", "Professional"),
        ],
        default="free",
    )
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    subscription_cancel_at_period_end = models.BooleanField(default=False)
    subscription_current_period_end = models.DateTimeField(null=True, blank=True)

    pdfs_downloaded = models.PositiveIntegerField(default=0)
    ai_analysis_used = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    def effective_tier(self) -> str:
        if self.trial_ends_at and self.trial_ends_at > timezone.now():
            return "pro"
        return self.subscription_tier

    def mark_email_verified(self):
        self.email_verified = True
        self.is_active = True
        self.save(update_fields=["email_verified", "is_active"])

    def __str__(self):
        return self.email

from .verification_models import UserActionCode
