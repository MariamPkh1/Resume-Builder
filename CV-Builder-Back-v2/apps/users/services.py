import random
from django.core.mail import send_mail
from django.conf import settings
from .verification_models import UserActionCode


def generate_numeric_code(length=6) -> str:
    return "".join(str(random.randint(0, 9)) for _ in range(length))


def issue_user_action_code(user, purpose: str, expiry_minutes: int = 15) -> UserActionCode:
    UserActionCode.objects.filter(
        user=user,
        purpose=purpose,
        used_at__isnull=True,
    ).update(used_at=UserActionCode.default_expiry(0))  

    code = generate_numeric_code(6)
    row = UserActionCode.objects.create(
        user=user,
        email=user.email,
        purpose=purpose,
        code=code,
        expires_at=UserActionCode.default_expiry(expiry_minutes),
    )
    return row


def send_verification_code_email(email: str, code: str):
    send_mail(
        subject="Nebula CV Builder - Verify your email",
        message=f"Your verification code is: {code}\nThis code expires in 15 minutes.",
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@nebula.local"),
        recipient_list=[email],
        fail_silently=False,
    )

def send_password_reset_code_email(email: str, code: str):
    send_mail(
        subject="Nebula CV Builder - Reset your password",
        message=f"Your password reset code is: {code}\nThis code expires in 15 minutes.",
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@nebula.local"),
        recipient_list=[email],
        fail_silently=False,
    )