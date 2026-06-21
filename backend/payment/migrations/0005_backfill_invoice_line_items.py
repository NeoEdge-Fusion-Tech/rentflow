from django.db import migrations


def backfill_invoices(apps, schema_editor):
    Invoice = apps.get_model('payment', 'Invoice')
    InvoiceLineItem = apps.get_model('payment', 'InvoiceLineItem')

    for invoice in Invoice.objects.select_related('booking', 'booking__client').filter(booking__isnull=False):
        booking = invoice.booking
        if not booking:
            continue

        if not invoice.client_id and booking.client_id:
            invoice.client_id = booking.client_id

        subtotal = 0
        position = 0
        for item in booking.items.all():
            InvoiceLineItem.objects.create(
                invoice=invoice,
                description=item.product.name if item.product_id else 'Item',
                quantity=item.quantity_booked,
                unit_price=item.unit_price,
                total=item.unit_price * item.quantity_booked,
                position=position,
            )
            subtotal += item.unit_price * item.quantity_booked
            position += 1

        invoice.subtotal = subtotal
        invoice.discount_amount = booking.discount_amount
        invoice.discount_percentage = booking.discount_percentage
        # total_amount is left untouched so historical totals don't shift.
        invoice.save(update_fields=['client', 'subtotal', 'discount_amount', 'discount_percentage'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('payment', '0004_invoice_client_invoice_discount_amount_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_invoices, noop_reverse),
    ]
