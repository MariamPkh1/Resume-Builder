from django.contrib.auth import get_user_model
from rest_framework import serializers
from apps.users.limits import limits_for_user
from .verification_models import UserActionCode

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    repeat_password = serializers.CharField(write_only=True, min_length=6)
    full_name = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate(self, attrs):
        if attrs["password"] != attrs["repeat_password"]:
            raise serializers.ValidationError({"repeat_password": "Passwords do not match."})
        return attrs


class VerifyEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=10)

    def validate_email(self, value):
        return value.lower()


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)

    def validate_email(self, value):
        return value.lower()


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower()


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=10)
    new_password = serializers.CharField(write_only=True, min_length=6)
    repeat_password = serializers.CharField(write_only=True, min_length=6)

    def validate_email(self, value):
        return value.lower()

    def validate(self, attrs):
        if attrs["new_password"] != attrs["repeat_password"]:
            raise serializers.ValidationError({"repeat_password": "Passwords do not match."})
        return attrs

class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField()

class MeSerializer(serializers.ModelSerializer):
    effective_tier = serializers.SerializerMethodField()
    trial_eligible = serializers.SerializerMethodField()
    limits = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "phone",
            "preferred_language",
            "email_verified",
            "is_active",
            "subscription_tier",
            "effective_tier",
            "trial_ends_at",
            "trial_eligible",
            "subscription_cancel_at_period_end",
            "subscription_current_period_end",
            "pdfs_downloaded",
            "ai_analysis_used",
            "limits",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_effective_tier(self, obj):
        return obj.effective_tier() if hasattr(obj, "effective_tier") else obj.subscription_tier

    def get_trial_eligible(self, obj):
        from apps.subscriptions.services import _is_trial_eligible
        return _is_trial_eligible(obj)

    def get_limits(self, obj):
        from apps.users.limits import limits_for_user, user_at_cv_limit

        l = limits_for_user(obj)
        return {
            "max_cvs": l.max_cvs,
            "max_versions": l.max_versions,
            "max_pdfs_per_month": l.max_pdfs_per_month,
            "max_storage_bytes": l.max_storage_bytes,
            "cv_slots_used": obj.cv_slots_used,
            "at_cv_limit": user_at_cv_limit(obj),
        }


class MeUpdateSerializer(serializers.ModelSerializer):
    preferred_language = serializers.ChoiceField(choices=["en", "ka"], required=False)

    class Meta:
        model = User
        fields = ["full_name", "phone", "preferred_language"]

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()
