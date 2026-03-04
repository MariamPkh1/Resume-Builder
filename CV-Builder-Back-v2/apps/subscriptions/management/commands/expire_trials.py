from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.subscriptions.models import SubscriptionHistory

User = get_user_model()


class Command(BaseCommand):
    help = "Expires finished trials and logs trial end events."

    def handle(self, *args, **options):
        now = timezone.now()

        qs = User.objects.filter(
            trial_ends_at__isnull=False,
            trial_ends_at__lte=now,
        )

        count = 0
        for user in qs.iterator():
            # If already not effectively on trial anymore, we still normalize state once.
            # We clear trial_ends_at so effective_tier() returns base subscription_tier.
            had_trial = user.trial_ends_at is not None

            old_effective = user.effective_tier() if hasattr(user, "effective_tier") else user.subscription_tier

            if user.trial_ends_at is not None:
                user.trial_ends_at = None
                user.save(update_fields=["trial_ends_at", "updated_at"])

                # Only log if it was acting like pro before expiry
                SubscriptionHistory.objects.create(
                    user=user,
                    event_type=SubscriptionHistory.EventType.TRIAL_ENDED,
                    from_tier="pro",
                    to_tier=user.subscription_tier,
                    metadata={"expired_at": now.isoformat()},
                )

                count += 1

        self.stdout.write(self.style.SUCCESS(f"Expired trials processed: {count}"))