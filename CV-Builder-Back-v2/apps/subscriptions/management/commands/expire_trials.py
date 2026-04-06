from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.subscriptions.services import expire_user_trial

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
            if expire_user_trial(user, now=now):
                count += 1

        self.stdout.write(self.style.SUCCESS(f"Expired trials processed: {count}"))
