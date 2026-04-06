from django.core.management.base import BaseCommand

from apps.subscriptions.services import expire_due_paid_subscriptions


class Command(BaseCommand):
    help = "Expire paid subscriptions whose billing period has ended."

    def handle(self, *args, **options):
        processed = expire_due_paid_subscriptions()
        self.stdout.write(self.style.SUCCESS(f"Expired paid subscriptions processed: {processed}"))
