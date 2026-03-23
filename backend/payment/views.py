from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Payment
from .serializers import PaymentSerializer
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
                status='pending'
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
