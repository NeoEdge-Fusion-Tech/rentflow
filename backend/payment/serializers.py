from rest_framework import serializers
from users.mixins import TenantSerializerMixin
from .models import Payment, Invoice, Receipt

class InvoiceSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = [
            'invoice_id', 'booking', 'invoice_number', 'issue_date', 
            'due_date', 'status', 'total_amount', 'notes'
        ]
        read_only_fields = ['invoice_number', 'issue_date']

class ReceiptSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = [
            'receipt_id', 'payment', 'receipt_number', 'issue_date', 
            'status', 'amount', 'notes'
        ]
        read_only_fields = ['receipt_number', 'issue_date']

class PaymentSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    client_name = serializers.CharField(source='booking.client.first_name', read_only=True)
    booking_ref = serializers.CharField(source='booking.booking_id', read_only=True)
    receipt = ReceiptSerializer(read_only=True)

    class Meta:
        model = Payment
        fields = [
            'payment_id', 'booking', 'booking_ref', 'client_name', 
            'amount', 'status', 'payment_date', 'invoice_id', 
            'receipt_id', 'receipt'
        ]
        read_only_fields = ['payment_date', 'invoice_id', 'receipt_id']

