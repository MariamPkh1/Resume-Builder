import uuid
from django.db import models
from apps.cvs.models import CV


class CVVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cv = models.ForeignKey(CV, on_delete=models.CASCADE, related_name="versions")

    title = models.CharField(max_length=255)
    cv_data = models.JSONField(default=dict, blank=True)
    section_order = models.JSONField(default=list, blank=True)
    language = models.CharField(max_length=5)
    template = models.CharField(max_length=32)

    note = models.CharField(max_length=255, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["cv", "-created_at"])]

    def __str__(self):
        return f"Version of {self.cv_id} at {self.created_at}"
