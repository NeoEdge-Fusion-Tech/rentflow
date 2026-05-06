from rest_framework import viewsets, status
from loguru import logger
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import FileResponse
from .models import Payment, Invoice, Receipt
from .serializers import PaymentSerializer, InvoiceSerializer, ReceiptSerializer
from .utils import generate_invoice_pdf, generate_receipt_pdf, initialize_paystack_transaction
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
            
            # Use client email for Paystack
            email = booking.client.email or request.user.email
            
            paystack_data = initialize_paystack_transaction(email, amount, booking_id)
            
            payment = Payment.objects.create(
                booking=booking,
                amount=amount,
                status='pending',
                created_by=request.user,
                # Reference from Paystack
                invoice_id=paystack_data['data']['reference'] 
            )
            
            return Response({
                "payment_id": payment.payment_id,
                "payment_link": paystack_data['data']['authorization_url'],
                "reference": paystack_data['data']['reference'],
                "message": "Paystack payment link generated."
            })
        except Exception as e:
            logger.error(f"Error creating payment link: {str(e)}")
            return Response({"error": str(e)}, status=400)

class InvoiceViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    filterset_fields = ['booking']

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
            logger.error(f"Error generating invoice: {str(e)}")
            return Response({"error": str(e)}, status=400)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        invoice = self.get_object()
        pdf_buffer = generate_invoice_pdf(invoice)
        filename = f"invoice_{invoice.invoice_number}.pdf"
        return FileResponse(pdf_buffer, as_attachment=True, filename=filename, content_type='application/pdf')

class ReceiptViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = Receipt.objects.all()
    serializer_class = ReceiptSerializer
    filterset_fields = ['payment', 'payment__booking']

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

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        receipt = self.get_object()
        pdf_buffer = generate_receipt_pdf(receipt)
        filename = f"receipt_{receipt.receipt_number}.pdf"
        return FileResponse(pdf_buffer, as_attachment=True, filename=filename, content_type='application/pdf')

from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
import hashlib
import hmac

class PaystackWebhookView(APIView):
    permission_classes = [] # Publicly accessible
    authentication_classes = []

    @method_decorator(csrf_exempt)
    def post(self, request, *args, **kwargs):
        payload = request.body
        signature = request.headers.get('x-paystack-signature')
        
        # Verify signature
        if settings.PAYSTACK_SECRET_KEY != 'sk_test_mock_key':
            expected_signature = hmac.new(
                settings.PAYSTACK_SECRET_KEY.encode('utf-8'),
                payload,
                digestmod=hashlib.sha512
            ).hexdigest()
            
            if signature != expected_signature:
                return Response({"status": "invalid signature"}, status=400)

        data = request.data
        event = data.get('event')
        
        if event == 'charge.success':
            reference = data['data']['reference']
            amount_paid = data['data']['amount'] / 100 # Convert back to Naira
            
            try:
                payment = Payment.objects.get(invoice_id=reference)
                if payment.status != 'completed':
                    payment.status = 'completed'
                    payment.save()
                    # The signal update_booking_paid_amount will take care of the rest
                    # The signal create_receipt_on_payment_completion will generate the receipt
                return Response({"status": "success"}, status=200)
            except Payment.DoesNotExist:
                return Response({"status": "payment not found"}, status=404)
        
        return Response({"status": "event ignored"}, status=200)
