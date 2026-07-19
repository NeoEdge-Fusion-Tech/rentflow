from django.db import models
from django.conf import settings
from django.utils import timezone
from inventory.models import Booking


class Payment(models.Model):
    payment_id = models.AutoField(primary_key=True)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='payments', null=True, blank=True)
    invoice_record = models.ForeignKey('Invoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='recorded_payments')
    # Denormalized for fast filtering without joins
    organization = models.ForeignKey(
        'users.Organization', on_delete=models.CASCADE,
        null=True, blank=True, related_name='payments'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('completed', 'Completed'), ('failed', 'Failed')], default='pending')
    payment_date = models.DateTimeField(auto_now_add=True)
    # Keeping for legacy compatibility if needed
    invoice_id = models.CharField(max_length=100, blank=True, null=True)
    receipt_id = models.CharField(max_length=100, blank=True, null=True)
    # Activity tracking
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_payments'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='updated_payments'
    )

    def save(self, *args, **kwargs):
        # Auto-populate organization from the linked booking
        if self.booking_id and not self.organization_id:
            self.organization = self.booking.organization
        elif self.invoice_record_id and not self.organization_id:
            self.organization = self.invoice_record.organization
        super().save(*args, **kwargs)


class Invoice(models.Model):
    invoice_id = models.AutoField(primary_key=True)
    booking = models.ForeignKey(Booking, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    client = models.ForeignKey(
        'users.Client', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='invoices'
    )
    organization = models.ForeignKey(
        'users.Organization', on_delete=models.CASCADE,
        related_name='invoices'
    )
    currency = models.ForeignKey(
        'users.Currency', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='invoices'
    )
    bank_account = models.ForeignKey(
        'users.BankAccount', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='invoices'
    )
    invoice_number = models.CharField(max_length=50, unique=True)
    issue_date = models.DateTimeField(default=timezone.now)
    due_date = models.DateTimeField(null=True, blank=True)
    title = models.CharField(max_length=255, blank=True, null=True, default='Invoice')
    status_choices = [
        ('draft', 'Draft'),
        ('issued', 'Issued'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled')
    ]
    status = models.CharField(max_length=20, choices=status_choices, default='draft')
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True, null=True)
    paystack_reference = models.CharField(max_length=100, blank=True, null=True, unique=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_invoices'
    )

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            last_invoice = Invoice.objects.filter(organization=self.organization).order_by('-created_at', '-invoice_id').first()
            if last_invoice and last_invoice.invoice_number:
                import re
                last_number_str = last_invoice.invoice_number
                match = re.search(r'(\d+)(?!.*\d)', last_number_str)
                if match:
                    number_str = match.group(1)
                    prefix = last_number_str[:match.start()]
                    suffix = last_number_str[match.end():]
                    next_number_int = int(number_str) + 1
                    next_number_padded = str(next_number_int).zfill(len(number_str))
                    self.invoice_number = f"{prefix}{next_number_padded}{suffix}"
                else:
                    self.invoice_number = f"{last_number_str}-01"
            else:
                import datetime
                year = datetime.datetime.now().year
                self.invoice_number = f"INV-{self.organization.id:02d}-{year}-0001"
        super().save(*args, **kwargs)


class InvoiceLineItem(models.Model):
    line_item_id = models.AutoField(primary_key=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='line_items')
    name = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['position', 'line_item_id']

    def save(self, *args, **kwargs):
        self.total = (self.quantity or 0) * (self.unit_price or 0)
        super().save(*args, **kwargs)


class Receipt(models.Model):
    receipt_id = models.AutoField(primary_key=True)
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name='receipt')
    organization = models.ForeignKey(
        'users.Organization', on_delete=models.CASCADE,
        related_name='receipts'
    )
    receipt_number = models.CharField(max_length=50, unique=True)
    issue_date = models.DateTimeField(auto_now_add=True)
    status_choices = [
        ('issued', 'Issued'),
        ('cancelled', 'Cancelled')
    ]
    status = models.CharField(max_length=20, choices=status_choices, default='issued')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_receipts'
    )

    def save(self, *args, **kwargs):
        if not self.receipt_number:
            import datetime
            year = datetime.datetime.now().year
            last_id = Receipt.objects.filter(receipt_number__startswith=f"REC-{year}").count()
            self.receipt_number = f"REC-{year}-{last_id + 1:04d}"
        super().save(*args, **kwargs)


class SubscriptionPayment(models.Model):
    """
    Tracks payments made by Organizations for their SaaS subscription plans.
    """
    subscription_payment_id = models.AutoField(primary_key=True)
    organization = models.ForeignKey(
        'users.Organization', on_delete=models.CASCADE,
        related_name='subscription_payments'
    )
    subscription = models.ForeignKey(
        'users.Subscription', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='payments'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='NGN')
    status_choices = [
        ('pending', 'Pending'),
        ('successful', 'Successful'),
        ('failed', 'Failed'),
    ]
    status = models.CharField(max_length=20, choices=status_choices, default='pending')
    payment_date = models.DateTimeField(auto_now_add=True)
    reference = models.CharField(max_length=100, unique=True, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.organization.name} - {self.amount} - {self.status}"

