from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from users.models import Client, Organization
from datetime import datetime, timedelta
import jwt
from django.conf import settings


def generate_client_token(client):
    payload = {
        "client_id": client.client_id,
        "organization_id": client.organization_id,
        "exp": datetime.utcnow() + timedelta(days=7),
        "iat": datetime.utcnow(),
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    return token


class ClientLoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, identifier):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response(
                {"error": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get the organization
        if str(identifier).isdigit():
            org = get_object_or_404(Organization, id=identifier)
        else:
            try:
                from inventory.models import OrganizationBookingSettings

                org_settings = get_object_or_404(
                    OrganizationBookingSettings, public_url_slug=identifier
                )
                org = org_settings.organization
            except:
                return Response(
                    {"error": "Storefront not found"}, status=status.HTTP_404_NOT_FOUND
                )

        # Find the client
        client = Client.objects.filter(organization=org, email=email).first()
        if not client:
            return Response(
                {"error": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not client.check_password(password):
            return Response(
                {"error": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token = generate_client_token(client)

        return Response(
            {
                "token": token,
                "client": {
                    "client_id": client.client_id,
                    "email": client.email,
                    "first_name": client.first_name,
                    "last_name": client.last_name,
                    "business_name": client.business_name,
                },
            }
        )


class ClientRegisterView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, identifier):
        email = request.data.get("email")
        password = request.data.get("password")
        first_name = request.data.get("first_name", "")
        last_name = request.data.get("last_name", "")

        if not email or not password:
            return Response(
                {"error": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get the organization
        if str(identifier).isdigit():
            org = get_object_or_404(Organization, id=identifier)
        else:
            try:
                from inventory.models import OrganizationBookingSettings

                org_settings = get_object_or_404(
                    OrganizationBookingSettings, public_url_slug=identifier
                )
                org = org_settings.organization
            except:
                return Response(
                    {"error": "Storefront not found"}, status=status.HTTP_404_NOT_FOUND
                )

        # Check if email exists
        if Client.objects.filter(organization=org, email=email).exists():
            return Response(
                {"error": "Client with this email already exists in this store."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        client = Client.objects.create(
            organization=org,
            email=email,
            first_name=first_name,
            last_name=last_name,
            client_type="individual",
            created_by_id=1,  # Default system user or leave null if allowed
        )
        client.set_password(password)
        client.save()

        token = generate_client_token(client)

        return Response(
            {
                "token": token,
                "client": {
                    "client_id": client.client_id,
                    "email": client.email,
                    "first_name": client.first_name,
                    "last_name": client.last_name,
                },
            },
            status=status.HTTP_201_CREATED,
        )


from inventory.models import Booking
from payment.models import Quotation
from rest_framework.decorators import api_view


def verify_client_token(request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload
    except:
        return None


class ClientBookingsView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, identifier):
        payload = verify_client_token(request)
        if not payload:
            return Response(
                {"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED
            )

        client_id = payload.get("client_id")
        bookings = Booking.objects.filter(client_id=client_id).order_by("-created_at")

        # Simple serialization
        data = []
        for b in bookings:
            data.append(
                {
                    "booking_id": b.booking_id,
                    "status": b.status,
                    "booking_title": b.booking_title,
                    "total_amount": b.total_amount,
                    "start_date": b.start_date,
                    "end_date": b.end_date,
                    "created_at": b.created_at,
                }
            )
        return Response(data)


class ClientQuotationsView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, identifier):
        payload = verify_client_token(request)
        if not payload:
            return Response(
                {"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED
            )

        client_id = payload.get("client_id")
        quotations = Quotation.objects.filter(client_id=client_id).order_by(
            "-created_at"
        )

        data = []
        for q in quotations:
            data.append(
                {
                    "quotation_id": q.quotation_id,
                    "status": q.status,
                    "title": q.title,
                    "total_amount": q.total_amount,
                    "created_at": q.created_at,
                }
            )
        return Response(data)
