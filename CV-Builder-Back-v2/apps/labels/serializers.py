from rest_framework import serializers
from .models import Label


class LabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Label
        fields = ["id", "name", "color", "created_at"]
        read_only_fields = ["id", "created_at"]
