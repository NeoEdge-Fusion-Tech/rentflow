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
)


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
            .select_related("organization")
            .prefetch_related("units")
        )


class PublicProductListView(generics.ListAPIView):
    serializer_class = PublicProductSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        identifier = self.kwargs["identifier"]
        org = get_organization_by_identifier(identifier)
        return Product.objects.filter(
            organization=org, is_active=True, available_for_rental=True
        ).prefetch_related("units")


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
        serializer = PublicBookingRequestSerializer(data=request.data)

        if serializer.is_valid():
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

            return Response(
                {
                    "message": "Booking request submitted successfully.",
                    "booking_id": booking.booking_id,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
