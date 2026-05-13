import time
from decimal import Decimal
from urllib.parse import urlencode

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from requests import HTTPError
from requests.auth import HTTPBasicAuth
import requests

from apps.users.limits import limits_for_user
from apps.cvs.models import CV

from .models import PaymentSession, SubscriptionHistory


PLAN_CATALOG = {
    "pro_monthly": {
        "tier": "pro",
        "amount_gel": Decimal("29.99"),
        "label": "Pro Monthly",
        "interval": "month",
    },
    "pro_yearly": {
        "tier": "pro",
        "amount_gel": Decimal("239.99"),
        "label": "Pro Yearly",
        "interval": "year",
    },
    "professional_monthly": {
        "tier": "professional",
        "amount_gel": Decimal("89.99"),
        "label": "Professional Monthly",
        "interval": "month",
    },
    "professional_yearly": {
        "tier": "professional",
        "amount_gel": Decimal("749.99"),
        "label": "Professional Yearly",
        "interval": "year",
    },
}


def make_order_id(user_id: str) -> str:
    return f"NEB-{str(user_id)[:8]}-{int(time.time())}"


def _build_callback_url(base_url: str, order_id: str) -> str:
    separator = "&" if "?" in base_url else "?"
    return f"{base_url}{separator}{urlencode({'order_id': order_id})}"


def is_stub_mode() -> bool:
    return getattr(settings, "PAYMENT_STUB_MODE", False)


def get_plan_details(plan: str) -> dict:
    try:
        return PLAN_CATALOG[plan]
    except KeyError as exc:
        raise ValueError("Invalid plan") from exc


def archive_excess_cvs_for_free_user(user, *, keep_active: int = 1) -> int:
    active_cvs = list(
        CV.objects.filter(user=user, is_archived=False).order_by("-updated_at", "-created_at")
    )
    if len(active_cvs) <= keep_active:
        return 0

    archived_ids = [cv.id for cv in active_cvs[keep_active:]]
    return CV.objects.filter(id__in=archived_ids).update(is_archived=True, updated_at=timezone.now())


def downgrade_user_to_free(user, *, reason: str, now=None, keep_active: int = 2, payment_session=None) -> int:
    now = now or timezone.now()
    old_tier = user.subscription_tier

    with transaction.atomic():
        user.subscription_tier = "free"
        user.subscription_cancel_at_period_end = False
        user.subscription_current_period_end = None
        user.save(
            update_fields=[
                "subscription_tier",
                "subscription_cancel_at_period_end",
                "subscription_current_period_end",
                "updated_at",
            ]
        )

        archived_count = archive_excess_cvs_for_free_user(user, keep_active=keep_active)
        SubscriptionHistory.objects.create(
            user=user,
            event_type=SubscriptionHistory.EventType.DOWNGRADED,
            from_tier=old_tier,
            to_tier="free",
            payment_session=payment_session,
            metadata={
                "reason": reason,
                "archived_cv_count": archived_count,
                "active_cv_limit_after_downgrade": keep_active,
                "downgraded_at": now.isoformat(),
            },
        )

    return archived_count


def start_pro_trial(user, *, trial_days: int = 7) -> bool:
    """Grant a 7-day Pro trial to a free user who has never had one."""
    now = timezone.now()

    if user.subscription_tier != "free":
        raise ValueError("Trial is only available for free-tier users.")

    if user.trial_ends_at and user.trial_ends_at > now:
        raise ValueError("You already have an active trial.")

    already_used = SubscriptionHistory.objects.filter(
        user=user,
        event_type=SubscriptionHistory.EventType.TRIAL_STARTED,
    ).exists()
    if already_used:
        raise ValueError("Trial has already been used.")

    trial_ends_at = now + timezone.timedelta(days=trial_days)

    with transaction.atomic():
        user.trial_ends_at = trial_ends_at
        user.save(update_fields=["trial_ends_at", "updated_at"])

        SubscriptionHistory.objects.create(
            user=user,
            event_type=SubscriptionHistory.EventType.TRIAL_STARTED,
            from_tier="free",
            to_tier="pro",
            metadata={
                "trial_days": trial_days,
                "trial_ends_at": trial_ends_at.isoformat(),
                "source": "pro_plan_selection",
            },
        )

    return True


def cancel_user_trial(user, *, now=None) -> bool:
    """Cancel an active trial without charging. Returns user to free tier."""
    now = now or timezone.now()

    if not user.trial_ends_at or user.trial_ends_at <= now:
        return False

    with transaction.atomic():
        user.trial_ends_at = None
        user.save(update_fields=["trial_ends_at", "updated_at"])

        SubscriptionHistory.objects.create(
            user=user,
            event_type=SubscriptionHistory.EventType.TRIAL_ENDED,
            from_tier="pro",
            to_tier=user.subscription_tier,
            metadata={"canceled_by_user": True, "canceled_at": now.isoformat()},
        )

        if user.subscription_tier == "free":
            archived_count = archive_excess_cvs_for_free_user(user, keep_active=1)
            if archived_count:
                SubscriptionHistory.objects.create(
                    user=user,
                    event_type=SubscriptionHistory.EventType.DOWNGRADED,
                    from_tier="pro",
                    to_tier="free",
                    metadata={
                        "reason": "trial_canceled",
                        "archived_cv_count": archived_count,
                        "active_cv_limit_after_downgrade": 1,
                    },
                )

    return True


def expire_user_trial(user, *, now=None) -> bool:
    now = now or timezone.now()
    if not user.trial_ends_at or user.trial_ends_at > now:
        return False

    with transaction.atomic():
        previous_effective_tier = user.effective_tier() if hasattr(user, "effective_tier") else user.subscription_tier
        user.trial_ends_at = None
        user.save(update_fields=["trial_ends_at", "updated_at"])

        SubscriptionHistory.objects.create(
            user=user,
            event_type=SubscriptionHistory.EventType.TRIAL_ENDED,
            from_tier=previous_effective_tier,
            to_tier=user.subscription_tier,
            metadata={"expired_at": now.isoformat()},
        )

        archived_count = 0
        if user.subscription_tier == "free":
            archived_count = archive_excess_cvs_for_free_user(user, keep_active=1)
            if archived_count:
                SubscriptionHistory.objects.create(
                    user=user,
                    event_type=SubscriptionHistory.EventType.DOWNGRADED,
                    from_tier="pro",
                    to_tier="free",
                    metadata={
                        "reason": "trial_expired",
                        "archived_cv_count": archived_count,
                        "active_cv_limit_after_downgrade": 1,
                    },
                )

    return True


def expire_paid_subscription(user, *, now=None, reason="period_ended") -> bool:
    now = now or timezone.now()
    if user.subscription_tier == "free":
        return False
    if not user.subscription_current_period_end or user.subscription_current_period_end > now:
        return False

    old_tier = user.subscription_tier
    downgrade_user_to_free(user, reason=reason, now=now, keep_active=2)

    SubscriptionHistory.objects.create(
        user=user,
        event_type=SubscriptionHistory.EventType.CANCELED,
        from_tier=old_tier,
        to_tier="free",
        metadata={
            "reason": reason,
            "expired_at": now.isoformat(),
        },
    )
    return True


def expire_due_paid_subscriptions(*, now=None) -> int:
    now = now or timezone.now()
    from django.contrib.auth import get_user_model

    User = get_user_model()
    count = 0
    due_users = User.objects.filter(
        subscription_tier__in=["pro", "professional"],
        subscription_current_period_end__isnull=False,
        subscription_current_period_end__lte=now,
    )
    for user in due_users:
        if expire_paid_subscription(
            user,
            now=now,
            reason="cancel_at_period_end" if user.subscription_cancel_at_period_end else "subscription_expired",
        ):
            count += 1
    return count


def create_stub_checkout_session(*, user, plan: str, gateway: str) -> PaymentSession:
    plan_info = get_plan_details(plan)
    order_id = make_order_id(user.id)
    payment_url = _build_callback_url(settings.PAYMENT_SUCCESS_URL, order_id)

    row = PaymentSession.objects.create(
        user=user,
        order_id=order_id,
        gateway=gateway,
        plan=plan,
        amount_gel=plan_info["amount_gel"],
        currency="GEL",
        status=PaymentSession.Status.PENDING,
        gateway_session_id=f"stub-{gateway}-{order_id}",
        payment_url=payment_url,
        request_payload={"plan": plan, "gateway": gateway},
        response_payload={
            "payment_url": payment_url,
            "cancel_url": _build_callback_url(settings.PAYMENT_CANCEL_URL, order_id),
            "stub": is_stub_mode(),
        },
    )
    return row


def _build_bog_order_payload(*, user, plan: str, amount_gel: Decimal) -> dict:
    return {
        "callback_url": settings.PAYMENT_SUCCESS_URL.replace("/payment-success/", "/../webhooks/bog/").replace("\\", "/"),
        "external_order_id": make_order_id(user.id),
        "buyer": {
            "full_name": user.full_name or user.email,
            "masked_email": user.email,
            "masked_phone": user.phone,
        },
        "purchase_units": {
            "currency": "GEL",
            "total_amount": float(amount_gel),
            "basket": [
                {
                    "product_id": plan,
                    "description": f"Nebula subscription {plan}",
                    "quantity": 1,
                    "unit_price": float(amount_gel),
                    "total_price": float(amount_gel),
                }
            ],
        },
        "redirect_urls": {
            "success": settings.PAYMENT_SUCCESS_URL,
            "fail": settings.PAYMENT_CANCEL_URL,
        },
    }


def get_bog_access_token() -> str:
    if not settings.BOG_CLIENT_ID or not settings.BOG_CLIENT_SECRET:
        raise RuntimeError("BOG credentials are not configured.")

    response = requests.post(
        settings.BOG_OAUTH_URL,
        data={"grant_type": "client_credentials"},
        auth=HTTPBasicAuth(settings.BOG_CLIENT_ID, settings.BOG_CLIENT_SECRET),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=20,
    )
    response.raise_for_status()
    token = response.json().get("access_token", "")
    if not token:
        raise RuntimeError("BOG OAuth response did not include an access token.")
    return token


def is_bog_configured() -> bool:
    return bool(settings.BOG_CLIENT_ID and settings.BOG_CLIENT_SECRET)


def create_bog_checkout_session(*, user, plan: str) -> PaymentSession:
    plan_info = get_plan_details(plan)
    payload = _build_bog_order_payload(
        user=user,
        plan=plan,
        amount_gel=plan_info["amount_gel"],
    )
    order_id = payload["external_order_id"]
    token = get_bog_access_token()

    response = requests.post(
        f"{settings.BOG_API_URL.rstrip('/')}/payments/v1/ecommerce/orders",
        json=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept-Language": user.preferred_language or "ka",
        },
        timeout=20,
    )
    response.raise_for_status()
    body = response.json()
    gateway_order_id = body.get("id", "")
    redirect_href = (((body.get("_links") or {}).get("redirect") or {}).get("href")) or ""
    if not gateway_order_id or not redirect_href:
        raise RuntimeError("BOG create order response did not include required fields.")

    return PaymentSession.objects.create(
        user=user,
        order_id=order_id,
        gateway=PaymentSession.Gateway.BOG,
        plan=plan,
        amount_gel=plan_info["amount_gel"],
        currency="GEL",
        status=PaymentSession.Status.PENDING,
        gateway_session_id=gateway_order_id,
        payment_url=redirect_href,
        request_payload=payload,
        response_payload={
            "gateway_order": body,
            "stub": False,
        },
    )


def _build_fastoo_order_payload(*, user, plan: str, amount_gel: Decimal) -> dict:
    payload = {
        "amount": float(amount_gel),
        "currency": "GEL",
        "merchant_order_id": make_order_id(user.id),
        "description": f"Nebula subscription {plan}",
        "client": {
            "email": user.email,
            "name": user.full_name or user.email,
            "phone": user.phone,
        },
        "options": {
            "auto_charge": 1,
            "language": user.preferred_language or "en",
            "return_url": settings.PAYMENT_SUCCESS_URL,
        },
    }
    if settings.FASTOO_TERMINAL:
        payload["options"]["terminal"] = settings.FASTOO_TERMINAL
    return payload


def create_fastoo_checkout_session(*, user, plan: str) -> PaymentSession:
    plan_info = get_plan_details(plan)
    if not settings.FASTOO_PROJECT_ID or not settings.FASTOO_API_PASSWORD:
        raise RuntimeError("Fastoo credentials are not configured.")

    payload = _build_fastoo_order_payload(
        user=user,
        plan=plan,
        amount_gel=plan_info["amount_gel"],
    )
    order_id = payload["merchant_order_id"]

    response = requests.post(
        f"{settings.FASTOO_API_URL.rstrip('/')}/orders/create",
        json=payload,
        auth=HTTPBasicAuth(settings.FASTOO_PROJECT_ID, settings.FASTOO_API_PASSWORD),
        timeout=20,
    )
    response.raise_for_status()

    body = response.json()
    orders = body.get("orders") or []
    if not orders:
        raise RuntimeError("Fastoo response did not include an order.")

    order = orders[0]
    gateway_order_id = order.get("id", "")
    payment_url = response.headers.get("Location", "")
    if not payment_url:
        raise RuntimeError("Fastoo response did not include a payment page URL.")

    return PaymentSession.objects.create(
        user=user,
        order_id=order_id,
        gateway=PaymentSession.Gateway.FASTOO,
        plan=plan,
        amount_gel=plan_info["amount_gel"],
        currency="GEL",
        status=PaymentSession.Status.PENDING,
        gateway_session_id=gateway_order_id,
        payment_url=payment_url,
        request_payload=payload,
        response_payload={
            "gateway_order": order,
            "stub": False,
        },
    )


def verify_fastoo_payment(payment_session: PaymentSession) -> dict:
    if not payment_session.gateway_session_id:
        raise RuntimeError("Payment session is missing Fastoo order ID.")
    if not settings.FASTOO_PROJECT_ID or not settings.FASTOO_API_PASSWORD:
        raise RuntimeError("Fastoo credentials are not configured.")

    response = requests.get(
        f"{settings.FASTOO_API_URL.rstrip('/')}/orders/{payment_session.gateway_session_id}",
        auth=HTTPBasicAuth(settings.FASTOO_PROJECT_ID, settings.FASTOO_API_PASSWORD),
        timeout=20,
    )
    response.raise_for_status()

    body = response.json()
    orders = body.get("orders") or []
    if not orders:
        raise RuntimeError("Fastoo verification response did not include an order.")

    order = orders[0]
    return {
        "gateway_order_id": order.get("id", ""),
        "status": (order.get("status") or "").lower(),
        "raw": body,
    }


def verify_bog_payment(payment_session: PaymentSession) -> dict:
    if not payment_session.gateway_session_id:
        raise RuntimeError("Payment session is missing BOG order ID.")

    token = get_bog_access_token()
    response = requests.get(
        f"{settings.BOG_API_URL.rstrip('/')}/payments/v1/receipt/{payment_session.gateway_session_id}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=20,
    )
    response.raise_for_status()
    body = response.json()
    order_status = (((body.get("order_status") or {}).get("key")) or "").lower()
    return {
        "gateway_order_id": body.get("order_id", payment_session.gateway_session_id),
        "status": order_status,
        "raw": body,
    }


def activate_subscription_from_payment(payment_session: PaymentSession):
    user = payment_session.user
    plan_info = get_plan_details(payment_session.plan)

    old_tier = user.subscription_tier
    new_tier = plan_info["tier"]
    now = timezone.now()
    previous_period_end = user.subscription_current_period_end

    if plan_info["interval"] == "year":
        current_period_end = now + timezone.timedelta(days=365)
    else:
        current_period_end = now + timezone.timedelta(days=30)

    user.subscription_tier = new_tier
    user.subscription_cancel_at_period_end = False
    user.subscription_current_period_end = current_period_end
    user.trial_ends_at = None  # clear any active trial when paid subscription activates
    user.save(
        update_fields=[
            "subscription_tier",
            "subscription_cancel_at_period_end",
            "subscription_current_period_end",
            "trial_ends_at",
            "updated_at",
        ]
    )

    SubscriptionHistory.objects.create(
        user=user,
        event_type=SubscriptionHistory.EventType.PAYMENT_CONFIRMED,
        from_tier=old_tier,
        to_tier=new_tier,
        payment_session=payment_session,
        metadata={
            "order_id": payment_session.order_id,
            "plan": payment_session.plan,
            "gateway": payment_session.gateway,
            "amount_gel": str(payment_session.amount_gel),
            "interval": plan_info["interval"],
            "stub": is_stub_mode(),
        },
    )

    lifecycle_event = (
        SubscriptionHistory.EventType.RENEWED
        if old_tier == new_tier and previous_period_end
        else SubscriptionHistory.EventType.UPGRADED
    )
    SubscriptionHistory.objects.create(
        user=user,
        event_type=lifecycle_event,
        from_tier=old_tier,
        to_tier=new_tier,
        payment_session=payment_session,
        metadata={
            "order_id": payment_session.order_id,
            "plan": payment_session.plan,
            "gateway": payment_session.gateway,
            "renewed_at": now.isoformat(),
        },
    )


def _is_trial_eligible(user) -> bool:
    now = timezone.now()
    if user.subscription_tier != "free":
        return False
    if user.trial_ends_at and user.trial_ends_at > now:
        return False
    return not SubscriptionHistory.objects.filter(
        user=user,
        event_type=SubscriptionHistory.EventType.TRIAL_STARTED,
    ).exists()


def get_subscription_status_payload(user):
    l = limits_for_user(user)
    latest_payment = user.payment_sessions.first()
    payload = {
        "subscription_tier": user.subscription_tier,
        "effective_tier": user.effective_tier() if hasattr(user, "effective_tier") else user.subscription_tier,
        "trial_ends_at": user.trial_ends_at,
        "trial_eligible": _is_trial_eligible(user),
        "subscription_cancel_at_period_end": getattr(user, "subscription_cancel_at_period_end", False),
        "subscription_current_period_end": getattr(user, "subscription_current_period_end", None),
        "limits": {
            "max_cvs": l.max_cvs,
            "max_versions": l.max_versions,
            "max_pdfs_per_month": l.max_pdfs_per_month,
            "max_storage_bytes": l.max_storage_bytes,
        },
    }

    if latest_payment:
        payload["latest_payment"] = {
            "order_id": latest_payment.order_id,
            "status": latest_payment.status,
            "plan": latest_payment.plan,
            "gateway": latest_payment.gateway,
            "amount_gel": str(latest_payment.amount_gel),
            "created_at": latest_payment.created_at,
        }

    return payload

def mark_payment_success_if_pending(payment_session: PaymentSession, *, source: str = "webhook") -> bool:
    """
    Idempotent payment success processor.
    Returns:
      True  -> state changed (pending -> success, activated)
      False -> already processed / no change
    """
    if payment_session.status != PaymentSession.Status.PENDING:
        return False

    payment_session.status = PaymentSession.Status.SUCCESS
    payment_session.response_payload = {
        **payment_session.response_payload,
        "success_source": source,
    }
    payment_session.paid_at = timezone.now()
    payment_session.save(update_fields=["status", "response_payload", "paid_at", "updated_at"])

    activate_subscription_from_payment(payment_session)
    return True


def mark_payment_failed(payment_session: PaymentSession, *, source: str = "webhook", reason: str = "") -> bool:
    if payment_session.status == PaymentSession.Status.FAILED:
        return False

    previous_status = payment_session.status
    payment_session.status = PaymentSession.Status.FAILED
    payment_session.response_payload = {
        **payment_session.response_payload,
        "failure_source": source,
        "failure_reason": reason,
    }
    payment_session.save(update_fields=["status", "response_payload", "updated_at"])

    SubscriptionHistory.objects.create(
        user=payment_session.user,
        event_type=SubscriptionHistory.EventType.PAYMENT_FAILED,
        from_tier=payment_session.user.subscription_tier,
        to_tier=payment_session.user.subscription_tier,
        payment_session=payment_session,
        metadata={
            "order_id": payment_session.order_id,
            "plan": payment_session.plan,
            "gateway": payment_session.gateway,
            "source": source,
            "reason": reason,
            "previous_status": previous_status,
        },
    )

    user = payment_session.user
    if (
        user.subscription_tier != "free"
        and user.subscription_current_period_end
        and user.subscription_current_period_end <= timezone.now()
    ):
        expire_paid_subscription(user, now=timezone.now(), reason="renewal_failed")

    return True


def process_gateway_webhook(payment_session: PaymentSession, *, payload: dict, source: str) -> bool:
    status_value = str(payload.get("status") or payload.get("order_status") or "").lower()
    if status_value in {"success", "succeeded", "completed", "charged", "authorized"}:
        return mark_payment_success_if_pending(payment_session, source=source)
    if status_value in {"failed", "error", "declined", "rejected", "refunded", "reversed", "canceled", "cancelled"}:
        return mark_payment_failed(payment_session, source=source, reason=status_value)
    return False


def process_payment_return(payment_session: PaymentSession) -> dict:
    if payment_session.status == PaymentSession.Status.SUCCESS:
        return {
            "changed": False,
            "status": payment_session.status,
            "detail": "Payment was already processed.",
        }

    if is_stub_mode():
        changed = mark_payment_success_if_pending(payment_session, source="return_url")
        return {
            "changed": changed,
            "status": payment_session.status,
            "detail": "Payment success processed." if changed else "Payment was already processed.",
        }

    if payment_session.gateway == PaymentSession.Gateway.FASTOO:
        verification = verify_fastoo_payment(payment_session)
        payment_session.response_payload = {
            **payment_session.response_payload,
            "verification": verification["raw"],
        }
        payment_session.save(update_fields=["response_payload", "updated_at"])

        if verification["status"] in {"charged", "authorized"}:
            changed = mark_payment_success_if_pending(payment_session, source="fastoo_return")
            return {
                "changed": changed,
                "status": payment_session.status,
                "detail": "Payment success processed." if changed else "Payment was already processed.",
            }
        if verification["status"] in {"reversed", "refunded"}:
            mark_payment_failed(payment_session, source="fastoo_return", reason=verification["status"])
            return {
                "changed": False,
                "status": payment_session.status,
                "detail": "Payment was not completed successfully.",
            }

    if payment_session.gateway == PaymentSession.Gateway.BOG:
        if not is_bog_configured():
            return {
                "changed": False,
                "status": payment_session.status,
                "detail": "Payment return received. Waiting for gateway confirmation.",
            }
        verification = verify_bog_payment(payment_session)
        payment_session.response_payload = {
            **payment_session.response_payload,
            "verification": verification["raw"],
        }
        payment_session.save(update_fields=["response_payload", "updated_at"])

        if verification["status"] == "completed":
            changed = mark_payment_success_if_pending(payment_session, source="bog_return")
            return {
                "changed": changed,
                "status": payment_session.status,
                "detail": "Payment success processed." if changed else "Payment was already processed.",
            }
        if verification["status"] in {"rejected", "refunded", "refunded_partially"}:
            mark_payment_failed(payment_session, source="bog_return", reason=verification["status"])
            return {
                "changed": False,
                "status": payment_session.status,
                "detail": "Payment was not completed successfully.",
            }

    return {
        "changed": False,
        "status": payment_session.status,
        "detail": "Payment return received. Waiting for gateway confirmation.",
    }
