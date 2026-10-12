from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from django.db import transaction

from inventory.models import Product, OrganizationBookingSettings, Booking, BookingItem
from users.models import Organization, Client
from payment.models import Quotation
from notification.whatsapp import WhatsAppService
from .serializers import (
    PublicProductSerializer,
    PublicBookingSettingsSerializer,
    PublicBookingRequestSerializer,
    GlobalMarketplaceProductSerializer,
    PublicMarketplaceTagSerializer,
)
from inventory.models import MarketplaceTag
from loguru import logger
from .booking_payments import (
    booking_from_token,
    confirmation_payload,
    deposit_amount,
    finalize_payment,
    safe_return_url,
    send_booking_email,
    start_payment,
    verify_with_paystack,
)
from users.marketplace import marketplace_ready_q


def get_organization_by_identifier(identifier):
    if str(identifier).isdigit():
        return get_object_or_404(Organization, id=identifier)
    else:
        settings = get_object_or_404(
            OrganizationBookingSettings, public_url_slug=identifier
        )
        return settings.organization


class GlobalMarketplaceProductListView(generics.ListAPIView):
    serializer_class = GlobalMarketplaceProductSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return (
            Product.objects.filter(
                is_active=True, available_for_rental=True, organization__isnull=False
            )
            # Only vendors with a complete profile appear on the marketplace.
            .filter(marketplace_ready_q())
            .select_related(
                "organization",
                "organization__currency",
                "organization__booking_settings",
                "category",
            )
            .prefetch_related("units", "marketplace_tags")
        )


class GlobalMarketplaceTagListView(generics.ListAPIView):
    serializer_class = PublicMarketplaceTagSerializer
    permission_classes = [AllowAny]
    pagination_class = None
    queryset = MarketplaceTag.objects.filter(is_active=True)


class PublicProductListView(generics.ListAPIView):
    serializer_class = PublicProductSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        identifier = self.kwargs["identifier"]
        org = get_organization_by_identifier(identifier)
        return (
            Product.objects.filter(
                organization=org, is_active=True, available_for_rental=True
            )
            .select_related("organization__currency", "category")
            .prefetch_related("units")
        )


class PublicBookingSettingsView(generics.RetrieveAPIView):
    serializer_class = PublicBookingSettingsSerializer
    permission_classes = [AllowAny]

    def get_object(self):
        identifier = self.kwargs["identifier"]
        org = get_organization_by_identifier(identifier)
        settings, _ = OrganizationBookingSettings.objects.get_or_create(
            organization=org
        )
        return settings


class PublicBookingRequestView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request, identifier):
        org = get_organization_by_identifier(identifier)
        booking_settings, _ = OrganizationBookingSettings.objects.get_or_create(
            organization=org
        )
        if not booking_settings.is_accepting_requests:
            return Response(
                {"error": "This store is not accepting rental requests right now."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = PublicBookingRequestSerializer(
            data=request.data, context={"booking_settings": booking_settings}
        )

        if serializer.is_valid():
            pay_now = serializer.validated_data.pop("pay_now", False)
            return_url = safe_return_url(
                serializer.validated_data.pop("return_url", "")
            )
            # Create or find client
            email = serializer.validated_data.pop("email")
            contact_name = serializer.validated_data.get("contact_name", "Public User")
            phone = serializer.validated_data.get("contact_phone", "")

            client, created = Client.objects.get_or_create(
                email=email,
                organization=org,
                defaults={
                    "first_name": contact_name.split()[0] if contact_name else "",
                    "last_name": (
                        " ".join(contact_name.split()[1:]) if contact_name else ""
                    ),
                    "business_name": contact_name,
                    "phone_number": phone,
                    "client_type": "individual",
                },
            )

            if not created:
                # Update client details if it already exists
                updated = False
                if contact_name and not client.business_name:
                    client.business_name = contact_name
                    client.first_name = contact_name.split()[0]
                    client.last_name = " ".join(contact_name.split()[1:])
                    updated = True
                if phone and not client.phone_number:
                    client.phone_number = phone
                    updated = True
                if updated:
                    client.save(
                        update_fields=[
                            "business_name",
                            "first_name",
                            "last_name",
                            "phone_number",
                        ]
                    )

            items_data = serializer.validated_data.pop("items")

            # Create booking
            booking = Booking.objects.create(
                organization=org,
                client=client,
                status="request",
                booking_title=f"Rental Request - {contact_name}",
                **serializer.validated_data,
            )

            # Create booking items
            total_amount = 0
            for item in items_data:
                from inventory.models import ProductUnit, BookingItemUnit

                unit = get_object_or_404(
                    ProductUnit, pk=item["product_unit_id"], product__organization=org
                )
                qty = item["quantity_booked"]
                product = unit.product
                unit_price = unit.rental_price
                total_price = unit_price * qty

                booking_item = BookingItem.objects.create(
                    booking=booking,
                    product=product,
                    organization=org,
                    quantity_booked=qty,
                    unit_price=unit_price,
                    total_price=total_price,
                )

                BookingItemUnit.objects.create(
                    booking_item=booking_item,
                    product_unit=unit,
                    quantity_picked_up=0,
                    quantity_returned_good=0,
                    quantity_returned_damaged=0,
                )
                total_amount += total_price

            booking.total_amount = total_amount
            booking.save()

            # Create Draft Quotation
            Quotation.objects.create(
                organization=org,
                client=client,
                booking=booking,
                status="draft",
                title=f"Quotation for {booking.booking_title or 'Booking Request'}",
                subtotal=total_amount,
                total_amount=total_amount,
            )

            # Send WhatsApp alert to organization
            if org.phone_number:
                WhatsAppService.send_template(
                    to_phone_number=org.phone_number,
                    template_name="new_booking_alert",
                    language_code="en",
                    components=[
                        {
                            "type": "body",
                            "parameters": [
                                {"type": "text", "text": contact_name},
                                {"type": "text", "text": str(booking.booking_id)},
                            ],
                        }
                    ],
                )

            if (
                pay_now
                and booking_settings.online_payments_enabled
                and booking.total_amount > 0
            ):
                amount = deposit_amount(
                    booking.total_amount, booking_settings.deposit_percent
                )
                try:
                    auth_url, reference = start_payment(
                        booking, email, amount, return_url
                    )
                except Exception as e:
                    # Keep the request; the guest can still be contacted.
                    logger.error(
                        f"Paystack init failed for booking {booking.booking_id}: {e}"
                    )
                    send_booking_email(booking, paid=False, request=request)
                    return Response(
                        {
                            "message": "Your request was sent, but online payment "
                            "couldn't start. The vendor will contact you.",
                            "booking_id": booking.booking_id,
                            "payment_error": str(e),
                            "confirmation": confirmation_payload(booking, request),
                        },
                        status=status.HTTP_201_CREATED,
                    )
                return Response(
                    {
                        "message": "Redirecting to payment.",
                        "booking_id": booking.booking_id,
                        "authorization_url": auth_url,
                        "reference": reference,
                        "amount": str(amount),
                    },
                    status=status.HTTP_201_CREATED,
                )

            send_booking_email(booking, paid=False, request=request)
            return Response(
                {
                    "message": "Booking request submitted successfully.",
                    "booking_id": booking.booking_id,
                    "confirmation": confirmation_payload(booking, request),
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PublicPaymentVerifyView(APIView):
    """POST {reference}: called when Paystack sends the guest back."""

    permission_classes = [AllowAny]

    def post(self, request):
        reference = (request.data.get("reference") or "").strip()
        if not reference:
            return Response({"error": "Missing payment reference."}, status=400)
        data = verify_with_paystack(reference)
        booking = finalize_payment(reference, data, request=request)
        if booking is None:
            return Response(
                {
                    "error": "We couldn't confirm this payment yet. If you were "
                    "charged, contact the vendor with your reference."
                },
                status=400,
            )
        return Response(confirmation_payload(booking, request))


class PublicBookingDocumentView(APIView):
    """GET /public/bookings/<token>/<invoice|receipt>/ → PDF (signed link)."""

    permission_classes = [AllowAny]

    def get(self, request, token, kind):
        from django.http import FileResponse, Http404
        from payment.models import Invoice, Receipt
        from payment.utils import generate_invoice_pdf, generate_receipt_pdf

        if kind not in ("invoice", "receipt"):
            raise Http404()
        booking = booking_from_token(token)
        if booking is None:
            raise Http404("Link expired or invalid.")
        if kind == "invoice":
            doc = Invoice.objects.filter(booking=booking).first()
            if doc is None:
                raise Http404("No invoice yet.")
            buf, name = generate_invoice_pdf(doc), f"invoice_{doc.invoice_number}.pdf"
        else:
            doc = (
                Receipt.objects.filter(payment__booking=booking)
                .order_by("-created_at")
                .first()
            )
            if doc is None:
                raise Http404("No receipt yet.")
            buf, name = generate_receipt_pdf(doc), f"receipt_{doc.receipt_number}.pdf"
        return FileResponse(
            buf, as_attachment=False, filename=name, content_type="application/pdf"
        )
