from django.db import migrations, models


def backfill_cv_slots_used(apps, schema_editor):
    User = apps.get_model("users", "User")
    CV = apps.get_model("cvs", "CV")
    for user in User.objects.all().iterator():
        count = CV.objects.filter(user_id=user.pk).count()
        if count > 0:
            User.objects.filter(pk=user.pk).update(cv_slots_used=count)


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0007_alter_user_preferred_language"),
        ("cvs", "0002_cv_labels"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="cv_slots_used",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.RunPython(backfill_cv_slots_used, migrations.RunPython.noop),
    ]
