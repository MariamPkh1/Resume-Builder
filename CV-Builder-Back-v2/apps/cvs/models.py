import uuid
from django.conf import settings
from django.db import models


class CV(models.Model):
    class Language(models.TextChoices):
        EN = "en", "English"
        KA = "ka", "Georgian"

    class Template(models.TextChoices):
        MODERN = "modern", "Modern"
        CLASSIC = "classic", "Classic"
        MINIMAL = "minimal", "Minimal"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cvs",
    )

    title = models.CharField(max_length=255, default="Untitled CV")

    labels = models.ManyToManyField("labels.Label", blank=True, related_name="cvs")

    cv_data = models.JSONField(default=dict, blank=True)

    section_order = models.JSONField(default=list, blank=True)

    language = models.CharField(max_length=5, choices=Language.choices, default=Language.EN)
    template = models.CharField(max_length=32, choices=Template.choices, default=Template.MODERN)

    is_archived = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "is_archived", "-updated_at"]),
        ]
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.title} ({self.user_id})"
