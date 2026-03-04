from dataclasses import dataclass
from django.utils import timezone
from datetime import timedelta

from .models import AIUsage


@dataclass(frozen=True)
class AIQuotaRule:
    free_lifetime: int | None = None
    pro_monthly: int | None = None
    professional_unlimited: bool = True


FEATURE_QUOTAS = {
    "analyze_cv": AIQuotaRule(free_lifetime=5, pro_monthly=100, professional_unlimited=True),


    "check_ats": AIQuotaRule(free_lifetime=0, pro_monthly=20, professional_unlimited=True),
    "tailor_for_job": AIQuotaRule(free_lifetime=0, pro_monthly=50, professional_unlimited=True),

    "improve_section": AIQuotaRule(free_lifetime=10, pro_monthly=None, professional_unlimited=True),

    "translate_cv": AIQuotaRule(free_lifetime=0, pro_monthly=None, professional_unlimited=True),
    "generate_cover_letter": AIQuotaRule(free_lifetime=0, pro_monthly=20, professional_unlimited=True),
}


def _month_start(now=None):
    now = now or timezone.now()
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def get_ai_quota_status(user, feature: str) -> dict:
    rule = FEATURE_QUOTAS.get(feature)
    if not rule:
        return {
            "allowed": False,
            "reason": "Unknown AI feature.",
            "used": 0,
            "limit": 0,
            "window": "unknown",
        }

    tier = user.effective_tier() if hasattr(user, "effective_tier") else "free"

    if tier == "professional" and rule.professional_unlimited:
        return {
            "allowed": True,
            "reason": "",
            "used": 0,
            "limit": -1,
            "window": "unlimited",
        }

    if tier == "pro":
        if rule.pro_monthly is None:
            return {
                "allowed": True,
                "reason": "",
                "used": 0,
                "limit": -1,
                "window": "monthly_unlimited",
            }

        start = _month_start()
        used = AIUsage.objects.filter(
            user=user,
            feature=feature,
            success=True,
            created_at__gte=start,
        ).count()

        allowed = used < rule.pro_monthly
        return {
            "allowed": allowed,
            "reason": "" if allowed else "Monthly AI quota reached for your plan.",
            "used": used,
            "limit": rule.pro_monthly,
            "window": "month",
        }

    free_limit = rule.free_lifetime if rule.free_lifetime is not None else 0
    used = AIUsage.objects.filter(
        user=user,
        feature=feature,
        success=True,
    ).count()

    allowed = used < free_limit
    return {
        "allowed": allowed,
        "reason": "" if allowed else "AI quota reached on Free plan. Upgrade to continue.",
        "used": used,
        "limit": free_limit,
        "window": "lifetime",
    }