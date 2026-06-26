from django.test import TestCase
from django.contrib.auth import get_user_model
from users.models import Organization, Client
from payment.models import Invoice, InvoiceLineItem
from decimal import Decimal

User = get_user_model()

class InvoiceModelTest(TestCase):
    def setUp(self):
        # Create an organization
        self.org = Organization.objects.create(
            name="Test Org",
            email="test@org.com",
            primary_color="#123456"
        )
        # Create a user
        self.user = User.objects.create(
            username="testuser",
            email="testuser@example.com",
            organization=self.org
        )
        # Create a client
        self.client = Client.objects.create(
            organization=self.org,
            first_name="Test",
            last_name="Client",
            email="client@example.com",
            created_by=self.user
        )

    def test_invoice_creation_generates_number(self):
        invoice = Invoice.objects.create(
            organization=self.org,
            client=self.client,
            status='draft'
        )
        # Check if invoice number was auto-generated
        self.assertTrue(invoice.invoice_number.startswith("INV-"))
        self.assertEqual(invoice.status, 'draft')

    def test_invoice_line_item_calculates_total(self):
        invoice = Invoice.objects.create(
            organization=self.org,
            client=self.client,
            status='draft'
        )
        line_item = InvoiceLineItem.objects.create(
            invoice=invoice,
            description="Consulting",
            quantity=Decimal('2.5'),
            unit_price=Decimal('100.00')
        )
        # 2.5 * 100 = 250.00
        self.assertEqual(line_item.total, Decimal('250.00'))
