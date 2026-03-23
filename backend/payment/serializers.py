from rest_framework import serializers
from users.mixins import TenantSerializerMixin
from .models import Payment

class PaymentSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    client_name = serializers.CharField(source='booking.client.first_name', read_only=True)
    booking_ref = serializers.CharField(source='booking.booking_id', read_only=True)

    class Meta:
        model = Payment
        fields = ['payment_id', 'booking', 'booking_ref', 'client_name', 'amount', 'status', 'payment_date', 'invoice_id', 'receipt_id']
        read_only_fields = ['status', 'payment_date', 'invoice_id', 'receipt_id']

