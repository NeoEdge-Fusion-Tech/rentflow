from django.db import models
from django.conf import settings
from django.utils import timezone
from inventory.models import Booking


def _next_document_number(model, organization, number_field, prefix):
    """
    Returns the next sequential document number for `model` scoped to
    `organization`, incrementing the trailing numeric run of the last
    document's number (e.g. INV-01-2026-0001 -> INV-01-2026-0002), or
    minting a fresh `{prefix}-{org_id:02d}-{year}-0001` if none exist yet.
    """
    import re
    last = model.objects.filter(organization=organization).order_by('-created_at', '-pk').first()
    last_number_str = getattr(last, number_field) if last else None
    if last_number_str:
        match = re.search(r'(\d+)(?!.*\d)', last_number_str)
        if match:
            number_str = match.group(1)
            head = last_number_str[:match.start()]
            tail = last_number_str[match.end():]
            next_number_int = int(number_str) + 1
            next_number_padded = str(next_number_int).zfill(len(number_str))
            return f"{head}{next_number_padded}{tail}"
        return f"{last_number_str}-01"
    year = timezone.now().year
    return f"{prefix}-{organization.id:02d}-{year}-0001"


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
    show_bank_details = models.BooleanField(default=True)
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
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
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
            self.invoice_number = _next_document_number(Invoice, self.organization, 'invoice_number', 'INV')
        super().save(*args, **kwargs)

    @property
    def amount_left(self):
        return max(0, self.total_amount - self.amount_paid)


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


class Quotation(models.Model):
    quotation_id = models.AutoField(primary_key=True)
    client = models.ForeignKey(
        'users.Client', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='quotations'
    )
    organization = models.ForeignKey(
        'users.Organization', on_delete=models.CASCADE,
        related_name='quotations'
    )
    currency = models.ForeignKey(
        'users.Currency', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='quotations'
    )
    bank_account = models.ForeignKey(
        'users.BankAccount', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='quotations'
    )
    show_bank_details = models.BooleanField(default=True)
    quotation_number = models.CharField(max_length=50, unique=True)
    issue_date = models.DateTimeField(default=timezone.now)
    expiry_date = models.DateTimeField(null=True, blank=True)
    title = models.CharField(max_length=255, blank=True, null=True, default='Quotation')
    status_choices = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
        ('converted', 'Converted'),
    ]
    status = models.CharField(max_length=20, choices=status_choices, default='draft')
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True, null=True)
    converted_invoice = models.ForeignKey(
        Invoice, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='source_quotation'
    )
    converted_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_quotations'
    )

    def save(self, *args, **kwargs):
        if not self.quotation_number:
            self.quotation_number = _next_document_number(Quotation, self.organization, 'quotation_number', 'QUO')
        super().save(*args, **kwargs)


class QuotationLineItem(models.Model):
    line_item_id = models.AutoField(primary_key=True)
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='line_items')
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

