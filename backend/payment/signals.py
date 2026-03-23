from django.db.models.signals import post_save
from django.dispatch import receiver
from inventory.models import Booking
from .models import Payment
from django.db.models import Sum

@receiver(post_save, sender=Booking)
def create_payment_on_booking_paid(sender, instance, **kwargs):
    """
    Automatically create a completed Payment record when a booking is marked as 'paid'
    if no completed payment for the total amount exists yet.
    """
    if instance.payment_status == 'paid':
        # Check if we already have completed payments for this booking
        existing_paid_total = Payment.objects.filter(
            booking=instance, 
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # If the total paid is less than the booking amount, create a payment for the difference
        if existing_paid_total < instance.total_amount:
            remaining = instance.total_amount - existing_paid_total
            Payment.objects.create(
                booking=instance,
                amount=remaining,
                status='completed',
                invoice_id=f"AUTO-INV-{instance.booking_id}",
                receipt_id=f"AUTO-REC-{instance.booking_id}"
            )
