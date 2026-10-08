from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from users.models import User
from inventory.models import (
    Organization,
    Product,
    ProductUnit,
    OrganizationBookingSettings,
    Booking,
    Client,
)


class PublicAPITests(APITestCase):
    def setUp(self):
        # Create an organization
        self.org = Organization.objects.create(name="Test Org", is_active=True)

        # Create an owner
        self.owner = User.objects.create_user(
            email="owner@test.com",
            password="testpassword",
            role="owner",
            organization_id=self.org.id,
        )
        self.org.owner = self.owner
        self.org.save()

        # Create booking settings
        self.settings = OrganizationBookingSettings.objects.create(
            organization=self.org,
            is_accepting_requests=True,
            available_days="Monday,Tuesday,Wednesday",
            open_time="09:00:00",
            close_time="17:00:00",
        )

        # Create a product available for rental
        self.product1 = Product.objects.create(
            name="Available Product",
            organization=self.org,
            available_for_rental=True,
            is_active=True,
            slug="available-product",
        )
        # Add a unit
        self.unit1 = ProductUnit.objects.create(
            product=self.product1,
            organization=self.org,
            status="available",
            rental_price=50.00,
        )

        # Create a product NOT available for rental
        self.product2 = Product.objects.create(
            name="Not Available Product",
            organization=self.org,
            available_for_rental=False,
            is_active=True,
            slug="not-available",
        )

    def test_global_marketplace_list(self):
        url = reverse("global-marketplace-products")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only return product1
        data = response.data["results"] if "results" in response.data else response.data
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "Available Product")
        self.assertIn("organization_name", data[0])
        self.assertEqual(data[0]["organization_name"], "Test Org")

    def test_public_product_list(self):
        url = reverse("public-product-list", kwargs={"org_id": self.org.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["results"] if "results" in response.data else response.data
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "Available Product")

    def test_public_booking_settings(self):
        url = reverse("public-booking-settings", kwargs={"org_id": self.org.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["is_accepting_requests"], True)

    def test_public_booking_request(self):
        url = reverse("public-booking-request", kwargs={"org_id": self.org.id})
        payload = {
            "contact_name": "John Doe",
            "contact_phone": "1234567890",
            "email": "johndoe@example.com",
            "event_type": "wedding",
            "setup_date": "2026-10-01T10:00:00Z",
            "set_down_date": "2026-10-02T10:00:00Z",
            "event_date": "2026-10-01T14:00:00Z",
            "country": "Nigeria",
            "city": "Lagos",
            "address": "123 Event Hall",
            "note_for_org": "Please be on time",
            "items": [{"product_id": self.product1.product_id, "quantity_booked": 1}],
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify Booking was created
        booking = Booking.objects.first()
        self.assertIsNotNone(booking)
        self.assertEqual(booking.status, "request")
        self.assertEqual(booking.client.email, "johndoe@example.com")
        self.assertEqual(booking.items.count(), 1)
        self.assertEqual(booking.items.first().product, self.product1)
