from rest_framework import serializers
from .models import CVVersion


class CVVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CVVersion
        fields = ["id", "note", "title", "language", "template", "created_at"]
        read_only_fields = ["id", "created_at", "title", "language", "template"]


class CVVersionDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = CVVersion
        fields = [
            "id",
            "note",
            "title",
            "cv_data",
            "section_order",
            "language",
            "template",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
