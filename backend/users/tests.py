from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from .models import Waitlist


class WaitlistAndBudgetCalculatorTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_create_waitlist_entry(self):
        url = reverse("waitlist")
        payload = {
            "first_name": "Ada",
            "last_name": "Lovelace",
            "company": "Analytical Engines Co",
            "email": "ada@example.com",
            "referral_type": "event budget",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data.get("success"))

        # Verify database record
        entry = Waitlist.objects.get(email="ada@example.com")
        self.assertEqual(entry.first_name, "Ada")
        self.assertEqual(entry.last_name, "Lovelace")
        self.assertEqual(entry.company, "Analytical Engines Co")
        self.assertEqual(entry.referral_type, "event_budget")

    def test_export_pdf_and_create_waitlist(self):
        url = reverse("budget-calculator-export")
        payload = {
            "format": "pdf",
            "client_price": 1500000,
            "currency_code": "NGN",
            "currency_symbol": "₦",
            "costs": [
                {"name": "Vendors and suppliers", "amount": 450000},
                {"name": "Crew and staff", "amount": 180000},
                {"name": "Transport and logistics", "amount": 60000},
                {"name": "Equipment rental", "amount": 150000},
                {"name": "Venue and permits", "amount": 0},
                {"name": "Other", "amount": 30000},
            ],
            "contingency_percent": 10,
            "target_margin_percent": 30,
            "user_info": {
                "first_name": "Kemi",
                "last_name": "Ade",
                "company": "Kemi Events",
                "email": "kemi@example.com",
            },
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertTrue(response.content.startswith(b"%PDF"))

        # Check lead was saved to waitlist
        entry = Waitlist.objects.filter(email="kemi@example.com").first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.company, "Kemi Events")
        self.assertEqual(entry.referral_type, "event_budget")

    def test_export_csv_excel(self):
        url = reverse("budget-calculator-export")
        payload = {
            "format": "excel",
            "client_price": 1500000,
            "currency_code": "NGN",
            "currency_symbol": "₦",
            "costs": [
                {"name": "Vendors and suppliers", "amount": 450000},
                {"name": "Crew and staff", "amount": 180000},
            ],
            "contingency_percent": 10,
            "target_margin_percent": 30,
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("text/csv", response["Content-Type"])
        content = response.content.decode("utf-8")
        self.assertIn("NeoOps - Event Budget & Profit Calculator Report", content)
        self.assertIn("Vendors and suppliers", content)
        self.assertIn("1,500,000.00", content)
