from rest_framework import serializers


class AnalyzeCVSerializer(serializers.Serializer):
    cv_id = serializers.UUIDField()
    job_description = serializers.CharField(required=False, allow_blank=True, default="")

class ImproveSectionSerializer(serializers.Serializer):
    cv_id = serializers.UUIDField()
    section_name = serializers.CharField(max_length=100)
    section_content = serializers.CharField()
    job_description = serializers.CharField(required=False, allow_blank=True, default="")

class CheckATSSerializer(serializers.Serializer):
    cv_id = serializers.UUIDField()
    job_description = serializers.CharField(required=False, allow_blank=True, default="")

class TailorForJobSerializer(serializers.Serializer):
    cv_id = serializers.UUIDField()
    job_description = serializers.CharField()
    focus_sections = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        allow_empty=True,
        default=list,
    )

class TranslateCVSerializer(serializers.Serializer):
    cv_id = serializers.UUIDField()
    target_language = serializers.ChoiceField(choices=["en", "ka"])
    source_language = serializers.ChoiceField(choices=["en", "ka"], required=False)

class GenerateCoverLetterSerializer(serializers.Serializer):
    cv_id = serializers.UUIDField()
    job_description = serializers.CharField()
    company_name = serializers.CharField(required=False, allow_blank=True, default="")
    tone = serializers.ChoiceField(
        choices=["professional", "friendly", "confident"],
        required=False,
        default="professional",
    )