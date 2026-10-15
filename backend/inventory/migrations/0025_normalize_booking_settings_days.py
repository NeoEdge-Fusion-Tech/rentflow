from django.db import migrations


def normalize(apps, schema_editor):
    from inventory.booking_rules import normalize_days

    Settings = apps.get_model("inventory", "OrganizationBookingSettings")
    for s in Settings.objects.all():
        try:
            days = normalize_days(s.available_days)
        except ValueError:
            days = []
        if days != s.available_days:
            s.available_days = days
            s.save(update_fields=["available_days"])


class Migration(migrations.Migration):
    dependencies = [
        ("inventory", "0024_booking_last_reminder_sent_at_alter_booking_status"),
    ]

    operations = [migrations.RunPython(normalize, migrations.RunPython.noop)]
