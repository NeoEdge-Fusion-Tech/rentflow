from rest_framework import viewsets, status, filters
import django_filters.rest_framework as django_filters
from loguru import logger
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import FileResponse
from .models import Payment, Invoice, Receipt, SubscriptionPayment
from .serializers import PaymentSerializer, InvoiceSerializer, ReceiptSerializer, SubscriptionPaymentSerializer, SubscriptionSerializer
from django.db.models import Sum, Count
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from users.models import Organization, Subscription
from .utils import generate_invoice_pdf, generate_receipt_pdf, initialize_paystack_transaction, initialize_paystack_transaction_for_invoice, initialize_paystack_transaction_for_subscription
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
            return Response({"error": "Failed to create payment link"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def create_subscription_link(self, request):
        plan_name = request.data.get('plan_name')
        if not plan_name:
            return Response({"error": "Plan name is required."}, status=400)
            
        # Determine amount based on plan
        amount = 49000 if plan_name.lower() == 'professional' else 99000
        if plan_name.lower() == 'free':
            return Response({"error": "Cannot pay for a free plan."}, status=400)

        try:
            email = request.user.email
            org_id = request.user.organization.id if hasattr(request.user, 'organization') and request.user.organization else None
            
            if not org_id:
                return Response({"error": "No organization attached to user."}, status=400)
                
            paystack_data = initialize_paystack_transaction_for_subscription(email, amount, org_id, plan_name)
            
            return Response({
                "payment_url": paystack_data['data']['authorization_url'],
                "reference": paystack_data['data']['reference'],
                "message": "Paystack subscription payment link generated."
            })
        except Exception as e:
            logger.error(f"Error creating subscription payment link: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SubscriptionPaymentViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionPayment.objects.all()
    serializer_class = SubscriptionPaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return SubscriptionPayment.objects.all().order_by('-payment_date')
        if hasattr(user, 'organization') and user.organization:
            return SubscriptionPayment.objects.filter(organization=user.organization).order_by('-payment_date')
        return SubscriptionPayment.objects.none()


class SuperAdminRevenueAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        total_revenue = SubscriptionPayment.objects.filter(status='successful').aggregate(Sum('amount'))['amount__sum'] or 0
        active_subscriptions = Subscription.objects.filter(status='active').count()
        
        # Breakdown by plan
        plan_breakdown = list(Subscription.objects.values('plan_name').annotate(count=Count('subscription_id')))
        
        recent_payments = SubscriptionPaymentSerializer(
            SubscriptionPayment.objects.filter(status='successful').order_by('-payment_date')[:10],
            many=True
        ).data

        return Response({
            "total_revenue": total_revenue,
            "active_subscriptions": active_subscriptions,
            "plan_breakdown": plan_breakdown,
            "recent_payments": recent_payments
        })


class OrganizationSubscriptionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'organization') or not request.user.organization:
            return Response({"error": "No organization attached"}, status=status.HTTP_400_BAD_REQUEST)
        
        org = request.user.organization
        subscription = getattr(org, 'subscription', None)
        sub_data = SubscriptionSerializer(subscription).data if subscription else None
        
        return Response({
            "organization_name": org.name,
            "subscription_plan": org.subscription_plan,
            "subscription_details": sub_data
        })

class InvoiceViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    filter_backends = [django_filters.DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['booking', 'client', 'status']
    search_fields = ['invoice_number']

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_superuser and hasattr(user, 'organization') and user.organization:
            org = user.organization
            from django.utils import timezone
            from rest_framework.exceptions import PermissionDenied
            from users.models import SubscriptionPlan
            
            plan_name = None
            if hasattr(org, 'subscription') and org.subscription:
                plan_name = org.subscription.plan_name
            elif org.subscription_plan:
                plan_name = org.subscription_plan
                
            plan = None
            if plan_name:
                plan = SubscriptionPlan.objects.filter(name__iexact=plan_name, is_active=True).first()
            if not plan:
                plan = SubscriptionPlan.objects.filter(is_free=True).first()
                
            if plan:
                if not plan.has_invoice:
                    raise PermissionDenied("Your current subscription plan does not include the Invoicing module. Please upgrade to continue.")
                
                if not serializer.validated_data.get('booking'):
                    quota = plan.max_invoices_per_month
                    if quota != -1:
                        now = timezone.now()
                        current_month_invoices = Invoice.objects.filter(
                            organization=org,
                            booking__isnull=True,
                            created_at__year=now.year,
                            created_at__month=now.month
                        ).count()
                        
                        if current_month_invoices >= quota:
                            raise PermissionDenied(f"You have reached your limit of {quota} standalone invoices per month. Please upgrade your plan or contact support to continue.")

        kwargs = {'created_by': user}
        if not user.is_superuser:
            kwargs['organization'] = user.organization
        serializer.save(**kwargs)

    @action(detail=False, methods=['get'])
    def prefill(self, request):
        """
        Returns an unsaved draft payload (client, line items, discount) built
        from a booking, for the frontend Invoice editor to populate. Creates
        nothing.
        """
        booking_id = request.query_params.get('booking_id')
        try:
            booking = Booking.objects.get(pk=booking_id, organization=request.user.organization)
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found."}, status=404)

        line_items = [
            {
                "name": item.product.name,
                "quantity": item.quantity_booked,
                "unit_price": item.unit_price,
            }
            for item in booking.items.all()
        ]
        return Response({
            "booking": booking.booking_id,
            "client": booking.client_id,
            "line_items": line_items,
            "discount_amount": booking.discount_amount,
            "discount_percentage": booking.discount_percentage,
        })

    @action(detail=True, methods=['post'])
    def generate_payment_link(self, request, pk=None):
        """
        Generates a Paystack payment link for this invoice.
        Only applicable when the client is Nigerian (NGN currency).
        Returns the authorization_url to share with the client.
        """
        invoice = self.get_object()

        if invoice.status == 'paid':
            return Response({"error": "Invoice is already paid."}, status=400)

        if not invoice.client:
            return Response({"error": "Invoice has no client attached."}, status=400)

        client_email = invoice.client.email
        if not client_email:
            return Response({"error": "Client has no email address."}, status=400)

        try:
            result = initialize_paystack_transaction_for_invoice(
                email=client_email,
                amount=invoice.total_amount,
                invoice_id=invoice.invoice_id,
                invoice_number=invoice.invoice_number,
            )
            reference = result['data']['reference']
            auth_url = result['data']['authorization_url']

            # Persist reference so webhook can look up this invoice
            invoice.paystack_reference = reference
            invoice.save(update_fields=['paystack_reference'])

            return Response({
                "payment_url": auth_url,
                "reference": reference,
                "invoice_number": invoice.invoice_number,
                "amount": str(invoice.total_amount),
            })
        except Exception as e:
            logger.error(f"Paystack payment link error for invoice {pk}: {e}")
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

from django.conf import settings
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
            amount_paid = data['data']['amount'] / 100  # Convert kobo → Naira

            # 1. Try to resolve as a subscription upgrade payment
            if data['data'].get('metadata', {}).get('source') == 'subscription_upgrade':
                metadata = data['data']['metadata']
                org_id = metadata.get('organization_id')
                plan_name = metadata.get('plan_name')
                
                try:
                    org = Organization.objects.get(id=org_id)
                    org.subscription_plan = plan_name
                    org.save(update_fields=['subscription_plan'])
                    
                    # Ensure subscription exists
                    from datetime import timedelta
                    from django.utils import timezone
                    subscription, _ = Subscription.objects.get_or_create(
                        organization=org,
                        defaults={'plan_name': plan_name}
                    )
                    subscription.plan_name = plan_name
                    subscription.status = 'active'
                    subscription.current_period_end = timezone.now() + timedelta(days=30)
                    subscription.save()
                    
                    # Log the payment
                    SubscriptionPayment.objects.create(
                        organization=org,
                        subscription=subscription,
                        amount=amount_paid,
                        status='successful',
                        reference=reference,
                        notes=f"Upgraded to {plan_name}"
                    )
                    logger.info(f"Subscription upgraded for org {org.name} to {plan_name}")
                    return Response({"status": "success", "source": "subscription_upgrade"}, status=200)
                except Organization.DoesNotExist:
                    logger.error(f"Organization {org_id} not found for subscription payment {reference}")
                    return Response({"status": "organization not found"}, status=404)

            # 2. Try to resolve as an invoice payment link reference
            invoice = Invoice.objects.filter(paystack_reference=reference).first()
            if invoice and invoice.status != 'paid':
                invoice.status = 'paid'
                invoice.save(update_fields=['status'])
                # Also update the linked booking if present
                if invoice.booking:
                    booking = invoice.booking
                    if booking.payment_status != 'paid':
                        booking.payment_status = 'paid'
                        booking.amount_paid = booking.total_amount
                        booking.save(update_fields=['payment_status', 'amount_paid'])
                logger.info(f"Invoice {invoice.invoice_number} marked paid via Paystack ref {reference}")
                return Response({"status": "success", "source": "invoice"}, status=200)

            # 2. Fall back to booking-based payment
            try:
                payment = Payment.objects.get(invoice_id=reference)
                if payment.status != 'completed':
                    payment.status = 'completed'
                    payment.save()
                return Response({"status": "success", "source": "payment"}, status=200)
            except Payment.DoesNotExist:
                pass

            return Response({"status": "reference not found"}, status=404)

        return Response({"status": "event ignored"}, status=200)
