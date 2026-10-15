from django.db import migrations


def backfill(apps, schema_editor):
    """Invoices auto-created from bookings never got the booking's client."""
    Invoice = apps.get_model("payment", "Invoice")
    for inv in Invoice.objects.filter(
        client__isnull=True, booking__isnull=False
    ).select_related("booking"):
        if inv.booking.client_id:
            inv.client_id = inv.booking.client_id
            inv.save(update_fields=["client"])


class Migration(migrations.Migration):
    dependencies = [("payment", "0021_quotation_booking")]
    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
