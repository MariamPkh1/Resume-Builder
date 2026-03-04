import uuid
from django.conf import settings
from django.db import models


class AIUsage(models.Model):
    class Feature(models.TextChoices):
        ANALYZE_CV = "analyze_cv", "Analyze CV"
        IMPROVE_SECTION = "improve_section", "Improve Section"
        CHECK_ATS = "check_ats", "Check ATS"
        TAILOR_FOR_JOB = "tailor_for_job", "Tailor for Job"
        TRANSLATE_CV = "translate_cv", "Translate CV"
        GENERATE_COVER_LETTER = "generate_cover_letter", "Generate Cover Letter"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ai_usages")

    feature = models.CharField(max_length=50, choices=Feature.choices)
    success = models.BooleanField(default=False)

    model_name = models.CharField(max_length=100, blank=True, default="")
    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)
    estimated_cost_usd = models.DecimalField(max_digits=10, decimal_places=5, default=0)

    request_payload = models.JSONField(default=dict, blank=True)
    response_payload = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "feature", "-created_at"]),
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.user_id} - {self.feature} - {'ok' if self.success else 'fail'}"