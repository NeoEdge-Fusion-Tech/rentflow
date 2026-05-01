from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from users.models import Organization, Client
from inventory.models import ProductCategory, Product, ProductUnit, Booking, BookingItem, BookingItemUnit

User = get_user_model()

def create_user(organization, username="testuser", email="test@test.com"):
    return User.objects.create_user(
        username=username,
        email=email,
        password="testpass123",
        organization=organization
    )

class ProductUnitSyncQuantitiesTestCase(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="Test Org")
        self.user = create_user(self.organization)
        self.category = ProductCategory.objects.create(
            organization=self.organization,
            name="Test Category"
        )
        self.product = Product.objects.create(
            organization=self.organization,
            category=self.category,
            name="Test Product"
        )

    def test_bulk_unit_sync_quantities(self):
        """Bulk unit: quantity_good = quantity - quantity_damaged"""
        unit = ProductUnit(
            product=self.product,
            unit_type="bulk",
            quantity=10,
            quantity_damaged=2
        )
        unit.save()
        unit.sync_quantities()
        self.assertEqual(unit.quantity_good, 8)
        self.assertEqual(unit.quantity_available, 8)
        self.assertEqual(unit.quantity_rented, 0)

    def test_bulk_unit_damaged_clamped_to_quantity(self):
        """quantity_damaged cannot exceed total quantity"""
        unit = ProductUnit(
            product=self.product,
            unit_type="bulk",
            quantity=5,
            quantity_damaged=10
        )
        unit.save()
        unit.sync_quantities()
        self.assertEqual(unit.quantity_damaged, 5)
        self.assertEqual(unit.quantity_good, 0)
        self.assertEqual(unit.quantity_available, 0)

    def test_single_unit_available_status(self):
        """Single unit with status=available"""
        unit = ProductUnit(
            product=self.product,
            unit_type="single",
            status="available"
        )
        unit.save()
        unit.refresh_from_db()
        self.assertEqual(unit.quantity_available, 1)
        self.assertEqual(unit.quantity_rented, 0)
        self.assertEqual(unit.quantity_damaged, 0)
        self.assertEqual(unit.quantity_good, 1)

    def test_single_unit_rented_status(self):
        """Single unit with status=rented"""
        unit = ProductUnit(
            product=self.product,
            unit_type="single",
            status="rented"
        )
        unit.save()
        unit.refresh_from_db()
        self.assertEqual(unit.quantity_available, 0)
        self.assertEqual(unit.quantity_rented, 1)
        self.assertEqual(unit.quantity_good, 1)

    def test_single_unit_damaged_status(self):
        """Single unit with status=damaged"""
        unit = ProductUnit(
            product=self.product,
            unit_type="single",
            status="damaged"
        )
        unit.save()
        unit.refresh_from_db()
        self.assertEqual(unit.quantity_available, 0)
        self.assertEqual(unit.quantity_damaged, 1)
        self.assertEqual(unit.quantity_good, 0)


class ProductSaveQuantitySyncTestCase(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="Test Org")
        self.category = ProductCategory.objects.create(
            organization=self.organization,
            name="Test Category"
        )
        self.product = Product.objects.create(
            organization=self.organization,
            category=self.category,
            name="Test Product"
        )

    def test_product_totals_sync_from_units(self):
        """Product totals should reflect sum of all its units"""
        ProductUnit(
            product=self.product,
            unit_type="bulk",
            quantity=10,
            quantity_damaged=2,
            unit_cost_price=50.00
        ).save()
        ProductUnit(
            product=self.product,
            unit_type="bulk",
            quantity=5,
            quantity_damaged=1,
            unit_cost_price=50.00
        ).save()
        self.product.refresh_from_db()
        self.assertEqual(self.product.total_quantity, 15)
        self.assertEqual(self.product.total_quantity_damaged_condition, 3)
        self.assertEqual(self.product.total_quantity_good_condition, 12)

    def test_product_totals_update_on_unit_delete(self):
        """Product totals should decrease when a unit is deleted"""
        unit = ProductUnit(
            product=self.product,
            unit_type="bulk",
            quantity=10,
        )
        unit.save()
        self.product.refresh_from_db()
        self.assertEqual(self.product.total_quantity, 10)
        unit.delete()
        self.product.refresh_from_db()
        self.assertEqual(self.product.total_quantity, 0)


class BookingSavePaymentStatusTestCase(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="Test Org")
        self.client_obj = Client.objects.create(
            organization=self.organization,
            first_name="John",
            last_name="Doe",
            email="john@doe.com"
        )

    def _make_booking(self, total_amount, amount_paid):
        return Booking.objects.create(
            organization=self.organization,
            client=self.client_obj,
            total_amount=total_amount,
            amount_paid=amount_paid
        )

    def test_payment_status_paid_when_fully_paid(self):
        booking = self._make_booking(total_amount=500, amount_paid=500)
        self.assertEqual(booking.payment_status, "paid")

    def test_payment_status_partial_when_partially_paid(self):
        booking = self._make_booking(total_amount=500, amount_paid=200)
        self.assertEqual(booking.payment_status, "partial")

    def test_payment_status_pending_when_not_paid(self):
        booking = self._make_booking(total_amount=500, amount_paid=0)
        self.assertEqual(booking.payment_status, "pending")

    def test_payment_status_paid_when_total_is_zero(self):
        """Free bookings should be marked as paid"""
        booking = self._make_booking(total_amount=0, amount_paid=0)
        self.assertEqual(booking.payment_status, "paid")

    def test_payment_status_updates_on_save(self):
        """Payment status should update when amount_paid changes"""
        booking = self._make_booking(total_amount=500, amount_paid=0)
        self.assertEqual(booking.payment_status, "pending")
        booking.amount_paid = 500
        booking.save()
        self.assertEqual(booking.payment_status, "paid")


class BookingItemUnitTotalReturnedTestCase(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="Test Org")
        self.client_obj = Client.objects.create(
            organization=self.organization,
            first_name="John",
            last_name="Doe",
            email="john@doe.com"
        )
        self.category = ProductCategory.objects.create(
            organization=self.organization,
            name="Test Category"
        )
        self.product = Product.objects.create(
            organization=self.organization,
            category=self.category,
            name="Test Product"
        )
        self.unit = ProductUnit(
            product=self.product,
            unit_type="bulk",
            quantity=10
        )
        self.unit.save()
        self.booking = Booking.objects.create(
            organization=self.organization,
            client=self.client_obj,
            total_amount=500,
            amount_paid=0
        )
        self.booking_item = BookingItem.objects.create(
            booking=self.booking,
            product=self.product,
            quantity_booked=5
        )

    def test_total_returned_is_sum_of_good_and_damaged(self):
        """total_returned property = quantity_returned_good + quantity_returned_damaged"""
        booking_unit = BookingItemUnit.objects.create(
            booking_item=self.booking_item,
            product_unit=self.unit,
            quantity=5,
            quantity_picked_up=5,
            quantity_returned_good=3,
            quantity_returned_damaged=1
        )
        self.assertEqual(booking_unit.total_returned, 4)

    def test_total_returned_zero_when_nothing_returned(self):
        booking_unit = BookingItemUnit.objects.create(
            booking_item=self.booking_item,
            product_unit=self.unit,
            quantity=5,
            quantity_picked_up=5,
            quantity_returned_good=0,
            quantity_returned_damaged=0
        )
        self.assertEqual(booking_unit.total_returned, 0)

    def test_total_returned_all_good(self):
        booking_unit = BookingItemUnit.objects.create(
            booking_item=self.booking_item,
            product_unit=self.unit,
            quantity=5,
            quantity_picked_up=5,
            quantity_returned_good=5,
            quantity_returned_damaged=0
        )
        self.assertEqual(booking_unit.total_returned, 5)