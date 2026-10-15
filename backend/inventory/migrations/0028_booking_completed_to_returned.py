from django.db import migrations, models


def completed_to_returned(apps, schema_editor):
    Booking = apps.get_model("inventory", "Booking")
    Booking.objects.filter(status="completed").update(status="returned")


class Migration(migrations.Migration):
    dependencies = [("inventory", "0027_seed_marketplace_tags")]

    operations = [
        migrations.RunPython(completed_to_returned, migrations.RunPython.noop),
    ]
