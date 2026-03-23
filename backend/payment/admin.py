from django.contrib import admin
from .models import Payment

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('payment_id', 'booking', 'amount', 'status', 'payment_date')
    search_fields = ('payment_id', 'booking__booking_id', 'invoice_id', 'receipt_id')
    list_filter = ('status',)
