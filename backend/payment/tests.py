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
            name="Test Org", email="test@org.com", primary_color="#123456"
        )
        # Create a user
        self.user = User.objects.create(
            username="testuser", email="testuser@example.com", organization=self.org
        )
        # Create a client
        self.client = Client.objects.create(
            organization=self.org,
            first_name="Test",
            last_name="Client",
            email="client@example.com",
            created_by=self.user,
        )

    def test_invoice_creation_generates_number(self):
        invoice = Invoice.objects.create(
            organization=self.org, client=self.client, status="draft"
        )
        # Check if invoice number was auto-generated
        self.assertTrue(invoice.invoice_number.startswith("INV-"))
        self.assertEqual(invoice.status, "draft")

    def test_invoice_line_item_calculates_total(self):
        invoice = Invoice.objects.create(
            organization=self.org, client=self.client, status="draft"
        )
        line_item = InvoiceLineItem.objects.create(
            invoice=invoice,
            name="Consulting",
            quantity=Decimal("2.5"),
            unit_price=Decimal("100.00"),
        )
        # 2.5 * 100 = 250.00
        self.assertEqual(line_item.total, Decimal("250.00"))


class IssueRequiresAmountTest(TestCase):
    """Invoices/quotations can stay draft while incomplete, but can't be
    issued/sent without a positive total."""

    def setUp(self):
        self.org = Organization.objects.create(
            name="Issue Org", email="issue@org.com", primary_color="#123456"
        )
        self.client_obj = Client.objects.create(
            organization=self.org, first_name="A", last_name="B", email="a@b.com"
        )

    def _payload(self, status, unit_price):
        return {
            "client": self.client_obj.pk,
            "status": status,
            "line_items": [{"name": "Item", "quantity": 1, "unit_price": unit_price}],
        }

    def _save(self, serializer_cls, data, instance=None, partial=False):
        s = serializer_cls(instance, data=data, partial=partial)
        valid = s.is_valid()
        if valid:
            return s.save(organization=self.org), s.errors
        return None, s.errors

    def test_invoice_zero_amount(self):
        from payment.serializers import InvoiceSerializer

        inv, errors = self._save(InvoiceSerializer, self._payload("issued", 0))
        self.assertIsNone(inv)
        self.assertIn("total_amount", errors)

        inv, errors = self._save(InvoiceSerializer, self._payload("draft", 0))
        self.assertIsNotNone(inv, errors)

        # Promoting the zero-amount draft is blocked
        _, errors = self._save(
            InvoiceSerializer, {"status": "issued"}, instance=inv, partial=True
        )
        self.assertIn("total_amount", errors)

        inv, errors = self._save(InvoiceSerializer, self._payload("issued", 500))
        self.assertIsNotNone(inv, errors)
        self.assertEqual(inv.status, "issued")

    def test_quotation_zero_amount(self):
        from payment.serializers import QuotationSerializer

        q, errors = self._save(QuotationSerializer, self._payload("sent", 0))
        self.assertIsNone(q)
        self.assertIn("total_amount", errors)

        q, errors = self._save(QuotationSerializer, self._payload("draft", 0))
        self.assertIsNotNone(q, errors)
        _, errors = self._save(
            QuotationSerializer, {"status": "sent"}, instance=q, partial=True
        )
        self.assertIn("total_amount", errors)
