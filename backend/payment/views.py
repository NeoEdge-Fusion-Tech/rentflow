from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Payment, Invoice, Receipt
from .serializers import PaymentSerializer, InvoiceSerializer, ReceiptSerializer
from inventory.models import Booking
from users.mixins import TenantIsolationMixin

class PaymentViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer

    @action(detail=False, methods=['post'])
    def create_payment_link(self, request):
        booking_id = request.data.get('booking_id')
        amount = request.data.get('amount')
        try:
            booking = Booking.objects.get(pk=booking_id, organization=request.user.organization)
            payment = Payment.objects.create(
                booking=booking,
                amount=amount,
                status='pending',
                created_by=request.user
            )
            payment.invoice_id = f"INV-{payment.payment_id}"
            payment.save()
            return Response({
                "payment_id": payment.payment_id,
                "payment_link": f"https://mock-payment-gateway.com/pay/{payment.payment_id}",
                "message": "Payment link generated."
            })
        except Exception as e:
            return Response({"error": str(e)}, status=400)

class InvoiceViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer

    @action(detail=False, methods=['post'])
    def generate(self, request):
        booking_id = request.data.get('booking_id')
        try:
            booking = Booking.objects.get(pk=booking_id, organization=request.user.organization)
            
            # Check if invoice already exists
            invoice = Invoice.objects.filter(booking=booking).first()
            if invoice:
                return Response(InvoiceSerializer(invoice).data)
            
            invoice = Invoice.objects.create(
                booking=booking,
                organization=request.user.organization,
                total_amount=booking.total_amount,
                status='issued',
                created_by=request.user
            )
            return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

class ReceiptViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = Receipt.objects.all()
    serializer_class = ReceiptSerializer

    @action(detail=False, methods=['post'])
    def generate(self, request):
        payment_id = request.data.get('payment_id')
        try:
            payment = Payment.objects.get(pk=payment_id, organization=request.user.organization)
            
            # Check if receipt already exists
            receipt = Receipt.objects.filter(payment=payment).first()
            if receipt:
                return Response(ReceiptSerializer(receipt).data)
            
            receipt = Receipt.objects.create(
                payment=payment,
                organization=request.user.organization,
                amount=payment.amount,
                status='issued',
                created_by=request.user
            )
            return Response(ReceiptSerializer(receipt).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=400)
