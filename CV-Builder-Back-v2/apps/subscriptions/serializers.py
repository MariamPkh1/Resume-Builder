from rest_framework import serializers


class CreateCheckoutSerializer(serializers.Serializer):
    plan = serializers.ChoiceField(choices=["pro_monthly", "pro_yearly"])
    gateway = serializers.ChoiceField(choices=["bog", "fastoo"])


class PaymentSuccessSerializer(serializers.Serializer):
    order_id = serializers.CharField()


class SubscriptionStatusSerializer(serializers.Serializer):
    subscription_tier = serializers.CharField()
    effective_tier = serializers.CharField()
    trial_ends_at = serializers.DateTimeField(allow_null=True)
    limits = serializers.DictField()
    latest_payment = serializers.DictField(required=False)

class CancelSubscriptionSerializer(serializers.Serializer):
    confirm = serializers.BooleanField(default=True)