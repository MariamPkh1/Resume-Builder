from rest_framework import serializers
from .models import CV
from apps.labels.serializers import LabelSerializer



class CVListSerializer(serializers.ModelSerializer):
    labels = LabelSerializer(many=True, read_only=True)

    class Meta:
        model = CV
        fields = ["id", "title", "language", "template", "is_archived", "labels", "updated_at", "created_at", "cv_data"]



class CVDetailSerializer(serializers.ModelSerializer):
    labels = LabelSerializer(many=True, read_only=True)

    class Meta:
        model = CV
        fields = [
            "id",
            "title",
            "cv_data",
            "section_order",
            "language",
            "template",
            "is_archived",
            "labels",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


    def validate_cv_data(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("cv_data must be an object (JSON).")
        return value

    def validate_section_order(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("section_order must be a list.")
        return value
