from django.db import models
from django.conf import settings
from inventory.models import Booking


class Payment(models.Model):
    payment_id = models.AutoField(primary_key=True)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='payments')
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
    issue_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField(null=True, blank=True)
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

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_invoices'
    )

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            # Simple format: INV-YEAR-ID
            import datetime
            year = datetime.datetime.now().year
            # This is a bit raceconfirmy but fine for now
            last_id = Invoice.objects.filter(invoice_number__startswith=f"INV-{year}").count()
            self.invoice_number = f"INV-{year}-{last_id + 1:04d}"
        super().save(*args, **kwargs)


class InvoiceLineItem(models.Model):
    line_item_id = models.AutoField(primary_key=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='line_items')
    description = models.CharField(max_length=500)
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
