from rest_framework import serializers
from users.mixins import TenantSerializerMixin
from .models import Payment, Invoice, InvoiceLineItem, Receipt
from .utils import compute_invoice_totals

class InvoiceLineItemSerializer(serializers.ModelSerializer):
    line_item_id = serializers.IntegerField(required=False)

    class Meta:
        model = InvoiceLineItem
        fields = ['line_item_id', 'description', 'details', 'quantity', 'unit_price', 'total', 'position']
        read_only_fields = ['total']


class InvoiceSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    line_items = InvoiceLineItemSerializer(many=True, required=False)
    client_name = serializers.SerializerMethodField()
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    currency_symbol = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'invoice_id', 'booking', 'client', 'client_name', 'invoice_number', 'issue_date',
            'due_date', 'status', 'currency', 'currency_symbol', 'bank_account', 'subtotal',
            'discount_amount', 'discount_percentage', 'tax_percentage', 'tax_amount', 'total_amount',
            'notes', 'line_items', 'organization_name'
        ]
        read_only_fields = ['invoice_number', 'issue_date', 'subtotal', 'tax_amount', 'total_amount']

    def get_client_name(self, obj):
        if obj.client:
            return f"{obj.client.first_name} {obj.client.last_name}"
        return None

    def get_currency_symbol(self, obj):
        currency = obj.currency or (obj.organization.currency if obj.organization_id else None)
        return currency.symbol if currency else None

    def validate(self, data):
        client = data.get('client') or (self.instance.client if self.instance else None)
        if not client:
            raise serializers.ValidationError({"client": "A client is required."})
        if not self.instance and not data.get('line_items'):
            raise serializers.ValidationError({"line_items": "At least one line item is required."})
        return data

    def _apply_totals(self, instance, line_items_data):
        subtotal, discount_value, tax_amount, total_amount = compute_invoice_totals(
            line_items_data,
            discount_amount=instance.discount_amount,
            discount_percentage=instance.discount_percentage,
            tax_percentage=instance.tax_percentage,
        )
        instance.subtotal = subtotal
        instance.tax_amount = tax_amount
        instance.total_amount = total_amount

    def create(self, validated_data):
        line_items_data = validated_data.pop('line_items', [])
        if not validated_data.get('currency'):
            organization = validated_data.get('organization')
            if organization and organization.currency:
                validated_data['currency'] = organization.currency
        invoice = Invoice(**validated_data)
        self._apply_totals(invoice, line_items_data)
        invoice.save()

        for idx, item_data in enumerate(line_items_data):
            item_data.pop('line_item_id', None)
            InvoiceLineItem.objects.create(invoice=invoice, position=idx, **item_data)
        return invoice

    def update(self, instance, validated_data):
        line_items_data = validated_data.pop('line_items', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if line_items_data is not None:
            existing_items = {item.line_item_id: item for item in instance.line_items.all()}

            kept_items = []
            for idx, item_data in enumerate(line_items_data):
                item_id = item_data.pop('line_item_id', None)
                item_data['position'] = idx
                if item_id and item_id in existing_items:
                    item = existing_items.pop(item_id)
                    for attr, value in item_data.items():
                        setattr(item, attr, value)
                    item.save()
                    kept_items.append(item)
                else:
                    kept_items.append(InvoiceLineItem.objects.create(invoice=instance, **item_data))

            # Remaining items were removed by the client
            for item in existing_items.values():
                item.delete()

            self._apply_totals(instance, kept_items)
        else:
            self._apply_totals(instance, instance.line_items.all())

        instance.save()
        return instance

class ReceiptSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    
    class Meta:
        model = Receipt
        fields = [
            'receipt_id', 'payment', 'receipt_number', 'issue_date', 
            'status', 'amount', 'notes', 'organization_name'
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

