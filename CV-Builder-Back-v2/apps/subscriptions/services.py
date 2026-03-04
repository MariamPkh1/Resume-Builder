import time
from decimal import Decimal
from django.utils import timezone

from apps.users.limits import limits_for_user

from django.utils import timezone
from .models import PaymentSession, SubscriptionHistory


PLAN_CATALOG = {
    # Adjust prices to your actual doc pricing later
    "pro_monthly": {
        "tier": "pro",
        "amount_gel": Decimal("19.00"),
        "label": "Pro Monthly",
    },
    "pro_yearly": {
        "tier": "pro",
        "amount_gel": Decimal("190.00"),
        "label": "Pro Yearly",
    },
}


def make_order_id(user_id: str) -> str:
    return f"NEB-{str(user_id)[:8]}-{int(time.time())}"


def create_stub_checkout_session(*, user, plan: str, gateway: str) -> PaymentSession:
    if plan not in PLAN_CATALOG:
        raise ValueError("Invalid plan")

    plan_info = PLAN_CATALOG[plan]
    order_id = make_order_id(user.id)

    # Stub hosted checkout URL (frontend can redirect to this or simulate flow)
    payment_url = f"http://127.0.0.1:8000/api/subscriptions/payment-success/?order_id={order_id}"

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
        response_payload={"payment_url": payment_url, "stub": True},
    )
    return row


def activate_subscription_from_payment(payment_session: PaymentSession):
    """Stub activation logic after successful payment."""
    user = payment_session.user
    plan_info = PLAN_CATALOG.get(payment_session.plan)
    if not plan_info:
        raise ValueError("Unknown plan in payment session")

    old_tier = user.subscription_tier
    new_tier = plan_info["tier"]

    user.subscription_tier = new_tier
    user.save(update_fields=["subscription_tier", "updated_at"])

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
            "stub": True,
        },
    )


def get_subscription_status_payload(user):
    l = limits_for_user(user)
    latest_payment = user.payment_sessions.first()
    payload = {
        "subscription_tier": user.subscription_tier,
        "effective_tier": user.effective_tier() if hasattr(user, "effective_tier") else user.subscription_tier,
        "trial_ends_at": user.trial_ends_at,
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
    payment_session.paid_at = timezone.now()
    payment_session.save(update_fields=["status", "paid_at", "updated_at"])

    activate_subscription_from_payment(payment_session)
    return True