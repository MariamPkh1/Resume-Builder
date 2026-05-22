from dataclasses import dataclass

@dataclass(frozen=True)
class Limits:
    max_cvs: int              # -1 unlimited
    max_versions: int         # -1 unlimited
    max_pdfs_per_month: int   # -1 unlimited (we'll enforce monthly logic later)
    max_storage_bytes: int    # -1 unlimited

MB = 1024 * 1024
GB = 1024 * 1024 * 1024

# Docs align:
# Free: 1–2
# Pro: 20 CVs
# Professional: unlimited
FREE = Limits(
    max_cvs=2,
    max_versions=0,
    max_pdfs_per_month=-1,   # docs: unlimited, but with ads/watermark
    max_storage_bytes=10 * MB,
)

PRO = Limits(
    max_cvs=20,
    max_versions=10,         # "last 10 versions"
    max_pdfs_per_month=-1,
    max_storage_bytes=500 * MB,
)

PROFESSIONAL = Limits(
    max_cvs=-1,
    max_versions=-1,
    max_pdfs_per_month=-1,
    max_storage_bytes=5 * GB,
)


def limits_for_user(user) -> Limits:
    tier = user.effective_tier() if hasattr(user, "effective_tier") else "free"
    if tier == "professional":
        return PROFESSIONAL
    if tier == "pro":
        return PRO
    return FREE


def cv_slots_used(user) -> int:
    """Lifetime resume slots consumed (increments on each CV created, never on delete)."""
    from apps.users.models import User

    if user.pk is None:
        return 0
    value = User.objects.filter(pk=user.pk).values_list("cv_slots_used", flat=True).first()
    return int(value or 0)


def user_at_cv_limit(user) -> bool:
    """True when lifetime slots used >= plan cap (Pro trial uses Pro cap via effective_tier)."""
    limits = limits_for_user(user)
    if limits.max_cvs == -1:
        return False
    return cv_slots_used(user) >= limits.max_cvs


def can_create_cv(user) -> bool:
    return not user_at_cv_limit(user)