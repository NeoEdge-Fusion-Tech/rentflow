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
        # If booking total amount or payment status changed, update invoice
        invoice = Invoice.objects.filter(booking=instance).first()
        if invoice:
            updated_fields = []
            if invoice.total_amount != instance.total_amount:
                invoice.total_amount = instance.total_amount
                updated_fields.append('total_amount')
            
            # Sync payment status to invoice
            if instance.payment_status == 'paid' and invoice.status != 'paid':
                invoice.status = 'paid'
                updated_fields.append('status')
            elif instance.payment_status != 'paid' and invoice.status == 'paid':
                invoice.status = 'issued' # revert to issued if booking is no longer fully paid
                updated_fields.append('status')

            if updated_fields:
                invoice.save(update_fields=updated_fields)

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

from django.db.models.signals import post_delete
from inventory.models import BookingItem
from .models import InvoiceLineItem

def sync_booking_items_to_invoice(booking):
    invoice = Invoice.objects.filter(booking=booking).first()
    # Only sync if invoice is in a mutable state
    if not invoice or invoice.status not in ['draft', 'issued']:
        return

    # Clear existing items and recreate to ensure exact match
    invoice.line_items.all().delete()
    
    for idx, item in enumerate(booking.items.all()):
        InvoiceLineItem.objects.create(
            invoice=invoice,
            name=item.product.name,
            description=item.product.description or '',
            quantity=item.quantity_booked,
            unit_price=item.unit_price,
            total=item.total_price,
            position=idx
        )
    
    # Recalculate totals
    subtotal = sum(i.total for i in invoice.line_items.all())
    invoice.subtotal = subtotal
    # If the invoice relies on booking total directly, it is already handled by the booking post_save signal
    invoice.save(update_fields=['subtotal'])

@receiver(post_save, sender=BookingItem)
def update_invoice_on_booking_item_save(sender, instance, **kwargs):
    if instance.booking:
        sync_booking_items_to_invoice(instance.booking)

@receiver(post_delete, sender=BookingItem)
def update_invoice_on_booking_item_delete(sender, instance, **kwargs):
    if getattr(instance, 'booking', None):
        sync_booking_items_to_invoice(instance.booking)
