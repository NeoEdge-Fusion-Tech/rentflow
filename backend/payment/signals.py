from django.db.models.signals import post_save
from django.dispatch import receiver
from inventory.models import Booking
from .models import Payment, Invoice, Receipt
from django.db.models import Sum

@receiver(post_save, sender=Booking)
def create_invoice_on_booking_creation(sender, instance, created, **kwargs):
    """
    Automatically create an Invoice record when a booking is created.
    """
    if created:
        Invoice.objects.get_or_create(
            booking=instance,
            organization=instance.organization,
            defaults={
                'total_amount': instance.total_amount,
                'status': 'issued',
                'created_by': instance.created_by
            }
        )
    else:
        # If booking total amount changed, update invoice
        invoice = Invoice.objects.filter(booking=instance).first()
        if invoice and invoice.total_amount != instance.total_amount:
            invoice.total_amount = instance.total_amount
            invoice.save(update_fields=['total_amount'])

@receiver(post_save, sender=Payment)
def create_receipt_on_payment_completion(sender, instance, **kwargs):
    """
    Automatically create a Receipt record when a payment is marked as 'completed'.
    """
    if instance.status == 'completed':
        # Check if receipt already exists for this payment
        if not hasattr(instance, 'receipt'):
            Receipt.objects.create(
                payment=instance,
                organization=instance.organization,
                amount=instance.amount,
                status='issued',
                created_by=instance.created_by
            )

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

@receiver(post_save, sender=Payment)
def update_booking_paid_amount(sender, instance, **kwargs):
    """
    Sync the linked Booking's amount_paid when a payment status changes.
    """
    if instance.booking:
        booking = instance.booking
        total_paid = Payment.objects.filter(
            booking=booking,
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        if booking.amount_paid != total_paid:
            booking.amount_paid = total_paid
            booking.save(update_fields=['amount_paid', 'payment_status'])
