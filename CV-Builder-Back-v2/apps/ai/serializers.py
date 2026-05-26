from rest_framework import serializers

def ai_language_field():
    return serializers.CharField(required=False, allow_blank=True, default="en")

class AnalyzeCVSerializer(serializers.Serializer):
    cv_id = serializers.UUIDField()
    language = ai_language_field()
    job_description = serializers.CharField(required=False, allow_blank=True, default="")

class ImproveSectionSerializer(serializers.Serializer):
    cv_id = serializers.UUIDField()
    section_name = serializers.CharField(max_length=100)
    language = ai_language_field()
    section_content = serializers.CharField()
    job_description = serializers.CharField(required=False, allow_blank=True, default="")

class CheckATSSerializer(serializers.Serializer):
    cv_id = serializers.UUIDField()
    language = ai_language_field()
    job_description = serializers.CharField(required=False, allow_blank=True, default="")
    target_role = serializers.CharField(required=False, allow_blank=True, default="")
    industry = serializers.CharField(required=False, allow_blank=True, default="")

class TailorForJobSerializer(serializers.Serializer):
    cv_id = serializers.UUIDField()
    job_description = serializers.CharField()
    language = ai_language_field()
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