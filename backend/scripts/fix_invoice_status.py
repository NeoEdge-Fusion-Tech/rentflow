import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from payment.models import Invoice

def fix_invoices():
    invoices = Invoice.objects.exclude(status__in=['draft', 'cancelled'])
    fixed = 0
    for inv in invoices:
        original_status = inv.status
        if inv.total_amount > 0 and inv.amount_paid >= inv.total_amount:
            inv.status = 'paid'
        elif inv.amount_paid > 0 and inv.amount_paid < inv.total_amount:
            inv.status = 'partially_paid'
        elif inv.amount_paid == 0 and inv.status in ['paid', 'partially_paid']:
            inv.status = 'issued'
            
        if inv.status != original_status:
            inv.save(update_fields=['status'])
            fixed += 1
            
    print(f"Fixed {fixed} invoices.")

if __name__ == '__main__':
    fix_invoices()
