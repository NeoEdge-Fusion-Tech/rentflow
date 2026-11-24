from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from users.models import Client, Organization, SubscriptionPlan

from .models import (
    Booking,
    BookingItem,
    BookingItemUnit,
    HandoverCheck,
    Product,
    ProductCategory,
    ProductUnit,
    UnitAccessory,
)

User = get_user_model()


class KitTestCase(TestCase):
    """An organization, a staff member, a client, and scan helpers."""

    def setUp(self):
        SubscriptionPlan.objects.update_or_create(
            name="Free", defaults={"is_free": True, "has_inventory": True}
        )
        self.org = Organization.objects.create(name="Org", email="org@example.com")
        self.user = User.objects.create(
            username="staff",
            email="staff@example.com",
            organization=self.org,
            role="admin",
            first_name="Ahmed",
        )
        self.customer = Client.objects.create(
            organization=self.org, first_name="AY", last_name="Rentals"
        )
        category = ProductCategory.objects.create(organization=self.org, name="Booths")
        self.product = Product.objects.create(
            organization=self.org, category=category, name="360 Booth"
        )
        self.api = APIClient()
        self.api.force_authenticate(self.user)

    # --- helpers -----------------------------------------------------------

    def make_unit(self, serial, unit_type="single", quantity=1, kit=()):
        unit = ProductUnit.objects.create(
            product=self.product,
            serial_number=serial,
            unit_type=unit_type,
            quantity=quantity,
        )
        for i, (name, qty, critical) in enumerate(kit):
            UnitAccessory.objects.create(
                product_unit=unit,
                name=name,
                quantity=qty,
                is_critical=critical,
                sort_order=i,
            )
        return unit

    def book(self, unit, quantity=1):
        booking = Booking.objects.create(
            organization=self.org,
            client=self.customer,
            status="confirmed",
            pickup_date=timezone.now(),
            return_date=timezone.now() + timezone.timedelta(days=2),
        )
        item = BookingItem.objects.create(
            booking=booking,
            product=self.product,
            quantity_booked=quantity,
            unit_price=0,
        )
        return BookingItemUnit.objects.create(
            booking_item=item, product_unit=unit, quantity=quantity
        )

    def scan(self, **data):
        return self.api.post("/api/inventory/scan/", data, format="json")

    def answers(self, lines, overrides=None):
        """All present, except {name: (confirmed, issue)} overrides."""
        overrides = overrides or {}
        result = []
        for line in lines:
            confirmed, issue = overrides.get(
                line["name"], (line["expected_quantity"], "")
            )
            result.append(
                {
                    "accessory_id": line["accessory_id"],
                    "confirmed_quantity": confirmed,
                    "issue": issue,
                }
            )
        return result

    def booth(self):
        return self.make_unit(
            "BOOTH-2",
            kit=[("Bolt", 4, True), ("Power cable", 1, True), ("Remote", 1, False)],
        )

    def checkout_all(self, serial):
        prompt = self.scan(serial_number=serial, action="pickup").json()
        return self.scan(
            serial_number=serial,
            action="pickup",
            checklist=self.answers(prompt["checklist"]),
        )

    def checkin(self, serial, overrides=None, condition="good"):
        base = dict(
            serial_number=serial,
            action="return",
            condition=condition,
            condition_submitted=True,
        )
        prompt = self.scan(**base).json()
        self.assertTrue(prompt.get("requires_checklist"), prompt)
        return prompt, self.scan(
            **base, checklist=self.answers(prompt["checklist"], overrides)
        )


class AccessoryChecklistTests(KitTestCase):
    """Kit checklists at check out (pickup) and check in (return)."""

    def test_pickup_asks_for_checklist_before_changing_anything(self):
        unit = self.booth()
        bu = self.book(unit)

        res = self.scan(serial_number="BOOTH-2", action="pickup").json()

        self.assertTrue(res["requires_checklist"])
        self.assertEqual(res["stage"], "check_out")
        self.assertEqual(
            [(ln["name"], ln["expected_quantity"]) for ln in res["checklist"]],
            [("Bolt", 4), ("Power cable", 1), ("Remote", 1)],
        )
        bu.refresh_from_db()
        self.assertEqual(bu.status, "pending")
        self.assertFalse(HandoverCheck.objects.exists())

    def test_full_checkout_and_checkin_completes_booking(self):
        unit = self.booth()
        bu = self.book(unit)

        res = self.checkout_all("BOOTH-2").json()
        self.assertTrue(res["success"])
        self.assertFalse(res["checklist"]["has_issues"])

        _, res = self.checkin("BOOTH-2")
        self.assertTrue(res.json()["success"])

        bu.refresh_from_db()
        self.assertEqual(bu.status, "returned")
        self.assertEqual(bu.booking_item.booking.status, "returned")
        self.assertEqual(bu.handover_checks.count(), 2)

    def test_missing_critical_part_marks_return_incomplete_until_resolved(self):
        unit = self.booth()
        bu = self.book(unit)
        self.checkout_all("BOOTH-2")

        _, res = self.checkin("BOOTH-2", {"Bolt": (3, "missing")})
        body = res.json()
        self.assertTrue(body["success"])
        self.assertTrue(body["checklist"]["is_incomplete"])
        self.assertEqual(
            body["checklist"]["flag_reason"], "Missing: 1 × Bolt (critical)"
        )

        bu.refresh_from_db()
        booking = bu.booking_item.booking
        self.assertEqual(bu.status, "returned_incomplete")
        self.assertEqual(booking.status, "returned_incomplete")
        # The unit itself is back in stock.
        unit.refresh_from_db()
        self.assertEqual(unit.status, "available")

        check = bu.handover_checks.get(stage="check_in")
        self.assertEqual(
            self.api.post(
                f"/api/inventory/handover-checks/{check.check_id}/resolve/", {}
            ).status_code,
            400,  # a note is required
        )
        res = self.api.post(
            f"/api/inventory/handover-checks/{check.check_id}/resolve/",
            {"note": "Replaced bolt from spares"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)

        bu.refresh_from_db()
        booking.refresh_from_db()
        self.assertEqual(bu.status, "returned")
        self.assertEqual(booking.status, "returned")

    def test_missing_minor_part_is_flagged_but_return_completes(self):
        unit = self.booth()
        bu = self.book(unit)
        self.checkout_all("BOOTH-2")

        _, res = self.checkin("BOOTH-2", {"Remote": (0, "missing")})
        body = res.json()["checklist"]
        self.assertTrue(body["has_issues"])
        self.assertFalse(body["is_incomplete"])

        bu.refresh_from_db()
        self.assertEqual(bu.status, "returned")
        self.assertEqual(bu.booking_item.booking.status, "returned")

    def test_part_not_sent_at_checkout_is_not_expected_back(self):
        unit = self.booth()
        self.book(unit)
        prompt = self.scan(serial_number="BOOTH-2", action="pickup").json()
        self.scan(
            serial_number="BOOTH-2",
            action="pickup",
            checklist=self.answers(prompt["checklist"], {"Remote": (0, "not_sent")}),
        )

        prompt, _ = self.checkin("BOOTH-2")
        self.assertEqual(
            [ln["name"] for ln in prompt["checklist"]], ["Bolt", "Power cable"]
        )

    def test_consumed_part_does_not_count_as_a_loss(self):
        unit = self.make_unit("CAM-1", kit=[("Battery", 3, True)])
        bu = self.book(unit)
        self.checkout_all("CAM-1")

        _, res = self.checkin("CAM-1", {"Battery": (2, "consumed")})
        self.assertFalse(res.json()["checklist"]["has_issues"])
        bu.refresh_from_db()
        self.assertEqual(bu.status, "returned")

    def test_unit_without_accessories_is_unchanged(self):
        self.make_unit("CHAIR-1")
        self.book(ProductUnit.objects.get(serial_number="CHAIR-1"))

        res = self.scan(serial_number="CHAIR-1", action="pickup").json()

        # No checklist step, but the handover is still recorded.
        self.assertTrue(res["success"])
        self.assertFalse(res["checklist"]["has_issues"])
        check = HandoverCheck.objects.get()
        self.assertEqual(check.performed_by, self.user)
        self.assertEqual(check.lines.count(), 0)

    def test_pickup_without_checklist_expects_full_kit_on_return(self):
        """Items picked up before this feature still get checked in."""
        unit = self.booth()
        bu = self.book(unit)
        unit.status = "rented"
        unit.save()
        bu.status = "picked_up"
        bu.quantity_picked_up = 1
        bu.save()

        prompt, _ = self.checkin("BOOTH-2")
        self.assertEqual(
            [(ln["name"], ln["expected_quantity"]) for ln in prompt["checklist"]],
            [("Bolt", 4), ("Power cable", 1), ("Remote", 1)],
        )

    def test_bulk_quantities_scale_and_final_return_expects_the_rest(self):
        unit = self.make_unit(
            "TABLE-BULK", unit_type="bulk", quantity=10, kit=[("Leg bolt", 4, True)]
        )
        bu = self.book(unit, quantity=3)

        prompt = self.scan(
            serial_number="TABLE-BULK", action="pickup", quantity=3
        ).json()
        self.assertEqual(prompt["checklist"][0]["expected_quantity"], 12)
        self.scan(
            serial_number="TABLE-BULK",
            action="pickup",
            quantity=3,
            checklist=self.answers(prompt["checklist"], {"Leg bolt": (11, "missing")}),
        )

        # Partial return of 1 table: 4 bolts expected.
        prompt = self.scan(
            serial_number="TABLE-BULK", action="return", qty_good=1, qty_damaged=0
        ).json()
        self.assertEqual(prompt["checklist"][0]["expected_quantity"], 4)
        self.scan(
            serial_number="TABLE-BULK",
            action="return",
            qty_good=1,
            qty_damaged=0,
            checklist=self.answers(prompt["checklist"]),
        )

        # Final return: only the 7 bolts that actually went out remain.
        prompt = self.scan(
            serial_number="TABLE-BULK", action="return", qty_good=2, qty_damaged=0
        ).json()
        self.assertEqual(prompt["checklist"][0]["expected_quantity"], 7)
        res = self.scan(
            serial_number="TABLE-BULK",
            action="return",
            qty_good=2,
            qty_damaged=0,
            checklist=self.answers(prompt["checklist"], {"Leg bolt": (6, "missing")}),
        ).json()
        self.assertTrue(res["checklist"]["is_incomplete"])
        bu.refresh_from_db()
        self.assertEqual(bu.status, "returned_incomplete")

    def test_stale_checklist_is_shown_again(self):
        unit = self.booth()
        bu = self.book(unit)
        prompt = self.scan(serial_number="BOOTH-2", action="pickup").json()
        UnitAccessory.objects.create(product_unit=unit, name="Tripod", quantity=1)

        res = self.scan(
            serial_number="BOOTH-2",
            action="pickup",
            checklist=self.answers(prompt["checklist"]),
        ).json()

        self.assertTrue(res["requires_checklist"])
        self.assertIn("Tripod", [ln["name"] for ln in res["checklist"]])
        bu.refresh_from_db()
        self.assertEqual(bu.status, "pending")


class UnitAccessoryApiTests(TestCase):
    def setUp(self):
        SubscriptionPlan.objects.update_or_create(
            name="Free", defaults={"is_free": True, "has_inventory": True}
        )
        self.org = Organization.objects.create(name="Org", email="org@example.com")
        self.user = User.objects.create(
            username="owner", email="o@example.com", organization=self.org, role="admin"
        )
        self.category = ProductCategory.objects.create(
            organization=self.org, name="Cameras"
        )
        self.api = APIClient()
        self.api.force_authenticate(self.user)

    def test_accessories_are_saved_updated_and_removed_per_unit(self):
        res = self.api.post(
            "/api/inventory/products/",
            {
                "name": "Camera",
                "category": self.category.pk,
                "units": [
                    {
                        "serial_number": "CAM-1",
                        "accessories": [
                            {"name": "Battery", "quantity": 3, "is_critical": True},
                            {"name": "Lens cap", "quantity": 1},
                        ],
                    },
                    {"serial_number": "CAM-2", "accessories": []},
                ],
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        units = {u["serial_number"]: u for u in res.json()["units"]}
        cam1 = units["CAM-1"]
        self.assertEqual(
            [(a["name"], a["quantity"]) for a in cam1["accessories"]],
            [("Battery", 3), ("Lens cap", 1)],
        )
        self.assertEqual(units["CAM-2"]["accessories"], [])

        battery = cam1["accessories"][0]
        cam1["accessories"] = [{**battery, "quantity": 2}]  # drop the lens cap
        res = self.api.put(
            f"/api/inventory/products/{res.json()['product_id']}/",
            {
                "name": "Camera",
                "category": self.category.pk,
                "units": [cam1, units["CAM-2"]],
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        cam1 = next(u for u in res.json()["units"] if u["serial_number"] == "CAM-1")
        self.assertEqual(
            [(a["accessory_id"], a["quantity"]) for a in cam1["accessories"]],
            [(battery["accessory_id"], 2)],
        )
        # Removed accessories are kept (inactive) for checklist history.
        self.assertFalse(UnitAccessory.objects.get(name="Lens cap").is_active)


class ValidatorAppTests(KitTestCase):
    """The validator's booking list, booking detail and access rules."""

    def test_list_defaults_to_today_and_searches(self):
        today = self.book(self.booth()).booking_item.booking
        later = self.book(self.make_unit("CAM-9")).booking_item.booking
        later.pickup_date = timezone.now() + timezone.timedelta(days=5)
        later.return_date = timezone.now() + timezone.timedelta(days=6)
        later.save()

        ids = [
            b["booking_id"]
            for b in self.api.get("/api/inventory/validation/bookings/").json()
        ]
        self.assertEqual(ids, [today.booking_id])

        res = self.api.get(
            "/api/inventory/validation/bookings/", {"date": "all", "search": "AY"}
        ).json()
        self.assertEqual(
            {b["booking_id"] for b in res}, {today.booking_id, later.booking_id}
        )
        self.assertEqual(res[0]["client_name"], "AY Rentals")

    def test_detail_shows_kit_actions_and_history(self):
        bu = self.book(self.booth())
        booking_id = bu.booking_item.booking_id
        self.checkout_all("BOOTH-2")

        res = self.api.get(f"/api/inventory/validation/bookings/{booking_id}/")
        self.assertEqual(res.status_code, 200)
        unit = res.json()["items"][0]["units"][0]
        self.assertEqual(len(unit["accessories"]), 3)
        self.assertFalse(unit["can_check_out"])
        self.assertTrue(unit["can_check_in"])
        self.assertEqual(len(unit["checks"]), 1)
        self.assertEqual(unit["checks"][0]["stage"], "check_out")
        self.assertEqual(unit["checks"][0]["performed_by_name"], "Ahmed")

    def test_scan_targets_the_exact_booking_line(self):
        unit = self.make_unit("CAM-1")
        first = self.book(unit)
        second = self.book(unit)

        self.scan(
            serial_number="CAM-1",
            action="pickup",
            booking_item_unit_id=second.booking_item_unit_id,
        )

        first.refresh_from_db()
        second.refresh_from_db()
        self.assertEqual(first.status, "pending")
        self.assertEqual(second.status, "picked_up")

    def test_access_by_role(self):
        from users.models import OrganizationMembership, Role
        from users.roles import ensure_default_roles

        ensure_default_roles(self.org)
        url = "/api/inventory/validation/bookings/"

        def user_with(username, legacy_role="staff", role_name=None):
            u = User.objects.create(
                username=username,
                email=f"{username}@example.com",
                organization=self.org,
                role=legacy_role,
            )
            if role_name:
                OrganizationMembership.objects.create(
                    user=u,
                    organization=self.org,
                    role=Role.objects.get(organization=self.org, name=role_name),
                    is_active=True,
                )
            api = APIClient()
            api.force_authenticate(u)
            return api

        self.assertEqual(user_with("v1", "validator").get(url).status_code, 200)
        self.assertEqual(
            user_with("v2", role_name="validator").get(url).status_code, 200
        )
        self.assertEqual(user_with("s1", role_name="support").get(url).status_code, 200)
        # A plain staff member without the validator_app permission.
        self.assertEqual(user_with("x1").get(url).status_code, 403)


class StockLocationTests(KitTestCase):
    def test_location_is_saved_listed_and_shown_to_validator(self):
        unit = self.booth()
        unit.stock_location = "Warehouse A · Shelf 3"
        unit.save()
        self.make_unit("CAM-1")  # no location
        bu = self.book(unit)

        self.assertEqual(
            self.api.get("/api/inventory/units/locations/").json(),
            ["Warehouse A · Shelf 3"],
        )
        detail = self.api.get(
            f"/api/inventory/validation/bookings/{bu.booking_item.booking_id}/"
        ).json()
        self.assertEqual(
            detail["items"][0]["units"][0]["stock_location"], "Warehouse A · Shelf 3"
        )
        prompt = self.scan(serial_number="BOOTH-2", action="pickup").json()
        self.assertEqual(prompt["stock_location"], "Warehouse A · Shelf 3")


class ConsumableTests(KitTestCase):
    def camera(self):
        unit = self.make_unit("CAM-1", kit=[("Lens cap", 1, False)])
        UnitAccessory.objects.create(
            product_unit=unit, name="AA battery", quantity=4, kind="consumable"
        )
        return unit

    def test_consumables_are_compulsory_at_check_out(self):
        self.book(self.camera())
        prompt = self.scan(serial_number="CAM-1", action="pickup").json()
        self.assertEqual(
            [(ln["name"], ln["kind"]) for ln in prompt["checklist"]],
            [("Lens cap", "accessory"), ("AA battery", "consumable")],
        )
        only_accessory = [
            a for a in self.answers(prompt["checklist"]) if a["confirmed_quantity"] == 1
        ]
        res = self.scan(
            serial_number="CAM-1", action="pickup", checklist=only_accessory
        ).json()
        self.assertTrue(res["requires_checklist"])  # battery not answered

    def test_consumables_are_optional_at_check_in_and_never_a_loss(self):
        bu = self.book(self.camera())
        self.checkout_all("CAM-1")
        base = dict(
            serial_number="CAM-1",
            action="return",
            condition="good",
            condition_submitted=True,
        )
        prompt = self.scan(**base).json()
        lens = [
            a for a in self.answers(prompt["checklist"]) if a["confirmed_quantity"] == 1
        ]

        # Batteries skipped entirely: the return still completes.
        res = self.scan(**base, checklist=lens).json()
        self.assertTrue(res["success"])
        self.assertFalse(res["checklist"]["has_issues"])
        bu.refresh_from_db()
        self.assertEqual(bu.status, "returned")
        check = bu.handover_checks.get(stage="check_in")
        self.assertEqual([ln.name for ln in check.lines.all()], ["Lens cap"])

    def test_short_consumables_at_check_in_are_used_up(self):
        bu = self.book(self.camera())
        self.checkout_all("CAM-1")
        _, res = self.checkin("CAM-1", {"AA battery": (1, "missing")})
        self.assertFalse(res.json()["checklist"]["has_issues"])
        line = bu.handover_checks.get(stage="check_in").lines.get(name="AA battery")
        self.assertEqual((line.confirmed_quantity, line.issue), (1, "consumed"))

    def test_reason_is_kept_for_consumables_not_returned(self):
        bu = self.book(self.camera())
        self.checkout_all("CAM-1")
        base = dict(
            serial_number="CAM-1",
            action="return",
            condition="good",
            condition_submitted=True,
        )
        prompt = self.scan(**base).json()
        answers = self.answers(prompt["checklist"], {"AA battery": (0, "")})
        for a in answers:
            if a["confirmed_quantity"] == 0:
                a["note"] = "Exhausted"
        res = self.scan(**base, checklist=answers).json()
        self.assertFalse(res["checklist"]["has_issues"])
        line = bu.handover_checks.get(stage="check_in").lines.get(name="AA battery")
        self.assertEqual((line.issue, line.note), ("consumed", "Exhausted"))

    def test_consumable_is_never_critical(self):
        acc = UnitAccessory.objects.create(
            product_unit=self.make_unit("CAM-2"),
            name="Gaffer tape",
            kind="consumable",
            is_critical=True,
        )
        self.assertFalse(acc.is_critical)
