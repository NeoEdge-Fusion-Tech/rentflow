import os
import django
import sys

# Setup Django
sys.path.append('/Users/sunday/Documents/Project/rentflow-saas/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from inventory.models import Booking
from payment.models import Payment
from django.db.models import Sum

def sync_payments():
    print("--- Syncing Payments for Paid Bookings ---")
    
    # Find all bookings marked 'paid'
    paid_bookings = Booking.objects.filter(payment_status='paid')
    print(f"Total 'paid' bookings found: {paid_bookings.count()}")
    
    sync_count = 0
    total_revenue_added = 0
    
    for booking in paid_bookings:
        # Calculate existing completed payments
        existing_paid_total = Payment.objects.filter(
            booking=booking, 
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        if existing_paid_total < booking.total_amount:
            remaining = booking.total_amount - existing_paid_total
            print(f"Creating missing payment for Booking #{booking.booking_id}: {remaining}")
            
            Payment.objects.create(
                booking=booking,
                amount=remaining,
                status='completed',
                invoice_id=f"SYNC-INV-{booking.booking_id}",
                receipt_id=f"SYNC-REC-{booking.booking_id}"
            )
            sync_count += 1
            total_revenue_added += remaining
            
    print(f"Sync complete. Created {sync_count} payment records.")
    print(f"Total revenue restored: {total_revenue_added}")

if __name__ == "__main__":
    sync_payments()
