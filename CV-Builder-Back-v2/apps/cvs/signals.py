from django.db.models import F
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.cvs.models import CV
from apps.users.models import User


@receiver(post_save, sender=CV)
def increment_user_cv_slots_used(sender, instance, created, **kwargs):
    if not created:
        return
    User.objects.filter(pk=instance.user_id).update(cv_slots_used=F("cv_slots_used") + 1)
