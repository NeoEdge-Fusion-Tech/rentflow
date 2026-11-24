from django.db import migrations


def seed(apps, schema_editor):
    from users.roles import ensure_default_roles

    Organization = apps.get_model("users", "Organization")
    Role = apps.get_model("users", "Role")
    for org in Organization.objects.all().iterator():
        ensure_default_roles(org, role_model=Role)


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0033_organization_vendor_payment_after_event_percentage_and_more"),
    ]

    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
