from django.core.management.base import BaseCommand, CommandError

from apps.cvs.pdf import check_pdf_engine


class Command(BaseCommand):
    help = "Check whether the PDF rendering engine is ready on this machine."

    def handle(self, *args, **options):
        ready, error = check_pdf_engine()
        if ready:
            self.stdout.write(self.style.SUCCESS("PDF engine ready: WeasyPrint render check passed."))
            return
        raise CommandError(f"PDF engine unavailable: {error}")
