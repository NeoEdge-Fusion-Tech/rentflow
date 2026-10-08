import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from payment.models import Invoice, Payment
from django.utils import timezone
from decimal import Decimal

invoices = Invoice.objects.filter(status="paid")
count = 0
for inv in invoices:
    # Update amount_paid if it's 0
    if inv.amount_paid == Decimal("0.00"):
        inv.amount_paid = inv.total_amount
        inv.save(update_fields=["amount_paid"])

    # Check if a payment already exists
    if not Payment.objects.filter(invoice=inv).exists():
        Payment.objects.create(
            organization=inv.organization,
            invoice=inv,
            amount=inv.total_amount,
            status="completed",
            payment_method="transfer",
            transaction_id=f"MIG-{inv.invoice_id}-{timezone.now().timestamp()}",
        )
        count += 1

print(f"Created {count} payment records and updated amount_paid for paid invoices.")
