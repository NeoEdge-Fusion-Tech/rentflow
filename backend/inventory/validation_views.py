"""
Validator app: the bookings to check out (pickup) and check in (return)
for a day, and each booking's units with their handover history.

Access is separate from the bookings module, so a Validator role only needs
the `validator_app` permission (see users.permissions.can_use_validator).
"""

import datetime
from zoneinfo import ZoneInfo

from django.db.models import Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import CanUseValidator

from .models import Booking, BookingItemUnit, HandoverCheck
from .serializers import HandoverCheckSerializer

VISIBLE_STATUSES = ["confirmed", "picked_up", "returned", "returned_incomplete"]
# Same statuses the scan endpoint accepts for a check out.
CHECK_OUT_STATUSES = ["booked", "confirmed", "picked_up"]


def _client_name(booking):
    c = booking.client
    if not c:
        return booking.contact_name or "Walk-in client"
    return (
        c.business_name
        or " ".join(p for p in (c.first_name, c.last_name) if p)
        or booking.contact_name
        or "Client"
    )


def _org_tz(org):
    try:
        return ZoneInfo(org.timezone)
    except Exception:
        return datetime.timezone.utc


def _base_queryset(user):
    return Booking.objects.filter(
        organization_id=user.organization_id, status__in=VISIBLE_STATUSES
    ).select_related("client")


def _unit_counts(booking):
    units = [u for item in booking.items.all() for u in item.units.all()]
    booked = sum(u.quantity for u in units)
    out = sum(u.quantity_picked_up for u in units)
    back = sum(u.quantity_returned_good + u.quantity_returned_damaged for u in units)
    return {"booked": booked, "checked_out": out, "checked_in": back}


PHASES = ("to_check_out", "out", "checked_in")


def _phase(booking, counts):
    """Coarse check out → check in stage; mirrors bookingPhase() in the app.

    to_check_out: nothing has gone out yet
    out:          some/all units went out and the booking isn't returned
    checked_in:   the booking was checked back in (complete or not)
    """
    if booking.status in ("returned", "returned_incomplete"):
        return "checked_in"
    if counts["checked_out"] == 0:
        return "to_check_out"
    return "out"


def _parse_day(value):
    try:
        return datetime.date.fromisoformat(value)
    except (TypeError, ValueError):
        return None


class ValidationBookingListView(APIView):
    """
    GET ?date=YYYY-MM-DD (default today) | date=all
        | from=YYYY-MM-DD&to=YYYY-MM-DD (custom range, inclusive)
        &search=<text>
        &phase=to_check_out|out|checked_in

    Bookings picked up or returned in that day/range (in the organization's
    timezone), searchable by client, title, contact, product or booking #,
    optionally narrowed to one check out / check in phase.
    """

    permission_classes = [permissions.IsAuthenticated, CanUseValidator]

    def get(self, request):
        user = request.user
        if not user.organization_id:
            return Response([])
        qs = _base_queryset(user).prefetch_related("items__product", "items__units")

        tz = _org_tz(user.organization)
        date_param = request.query_params.get("date") or ""
        range_from = _parse_day(request.query_params.get("from"))
        range_to = _parse_day(request.query_params.get("to"))
        if range_from or range_to:
            first = range_from or range_to
            last = range_to or range_from
            if last < first:
                first, last = last, first
            start = datetime.datetime.combine(first, datetime.time.min, tzinfo=tz)
            end = datetime.datetime.combine(
                last + datetime.timedelta(days=1), datetime.time.min, tzinfo=tz
            )
            qs = qs.filter(
                Q(pickup_date__gte=start, pickup_date__lt=end)
                | Q(return_date__gte=start, return_date__lt=end)
            )
        elif date_param != "all":
            day = _parse_day(date_param) or datetime.datetime.now(tz).date()
            start = datetime.datetime.combine(day, datetime.time.min, tzinfo=tz)
            end = start + datetime.timedelta(days=1)
            qs = qs.filter(
                Q(pickup_date__gte=start, pickup_date__lt=end)
                | Q(return_date__gte=start, return_date__lt=end)
            )

        search = (request.query_params.get("search") or "").strip()
        if search:
            q = (
                Q(booking_title__icontains=search)
                | Q(client__business_name__icontains=search)
                | Q(client__first_name__icontains=search)
                | Q(client__last_name__icontains=search)
                | Q(contact_name__icontains=search)
                | Q(items__product__name__icontains=search)
            )
            digits = search.lstrip("#")
            if digits.isdigit():
                q |= Q(booking_id=int(digits))
            qs = qs.filter(q).distinct()

        open_flags = set(
            HandoverCheck.objects.filter(
                organization_id=user.organization_id,
                is_incomplete=True,
                resolved_at__isnull=True,
            ).values_list("booking_item_unit__booking_item__booking_id", flat=True)
        )

        phase = request.query_params.get("phase")
        if phase not in PHASES:
            phase = None
        # Phase depends on unit counts, so narrow cheaply by status first.
        if phase == "checked_in":
            qs = qs.filter(status__in=["returned", "returned_incomplete"])
        elif phase:
            qs = qs.exclude(status__in=["returned", "returned_incomplete"])

        results = []
        for b in qs.order_by("pickup_date", "booking_id"):
            counts = _unit_counts(b)
            if phase and _phase(b, counts) != phase:
                continue
            if len(results) >= 200:
                break
            results.append(
                {
                    "booking_id": b.booking_id,
                    "booking_title": b.booking_title,
                    "client_name": _client_name(b),
                    "contact_name": b.contact_name,
                    "contact_phone": b.contact_phone,
                    "pickup_date": b.pickup_date,
                    "return_date": b.return_date,
                    "status": b.status,
                    "delivery_mode": b.delivery_mode,
                    "items": [
                        {
                            "product_name": i.product.name if i.product else "",
                            "quantity": i.quantity_booked,
                        }
                        for i in b.items.all()
                    ],
                    "counts": counts,
                    "has_open_issues": b.booking_id in open_flags,
                }
            )
        return Response(results)


class ValidationBookingDetailView(APIView):
    """What was booked, unit by unit: its kit, what can be done now, and
    every check out / check in so far."""

    permission_classes = [permissions.IsAuthenticated, CanUseValidator]

    def get(self, request, pk):
        user = request.user
        checks = HandoverCheck.objects.select_related(
            "performed_by",
            "resolved_by",
            "booking_item_unit__booking_item",
            "booking_item_unit__product_unit__product",
        ).prefetch_related("lines")
        booking = get_object_or_404(
            _base_queryset(user).prefetch_related(
                "items__product",
                Prefetch(
                    "items__units",
                    queryset=BookingItemUnit.objects.select_related(
                        "product_unit"
                    ).prefetch_related(
                        "product_unit__accessories",
                        Prefetch("handover_checks", queryset=checks),
                    ),
                ),
            ),
            pk=pk,
        )
        can_go_out = booking.status in CHECK_OUT_STATUSES

        items = []
        for item in booking.items.all():
            units = []
            for bu in item.units.all():
                pu = bu.product_unit
                returned = bu.quantity_returned_good + bu.quantity_returned_damaged
                units.append(
                    {
                        "booking_item_unit_id": bu.booking_item_unit_id,
                        "serial_number": pu.serial_number,
                        "unit_name": pu.name,
                        "unit_type": pu.unit_type,
                        "stock_location": pu.stock_location,
                        "quantity": bu.quantity,
                        "quantity_checked_out": bu.quantity_picked_up,
                        "quantity_checked_in": returned,
                        "status": bu.status,
                        "accessories": [
                            {
                                "kind": a.kind,
                                "name": a.name,
                                "quantity": a.quantity,
                                "description": a.description,
                                "is_critical": a.is_critical,
                            }
                            for a in pu.accessories.all()
                            if a.is_active
                        ],
                        "can_check_out": can_go_out
                        and bu.quantity_picked_up < bu.quantity,
                        "can_check_in": bu.quantity_picked_up > returned,
                        # Oldest first.
                        "checks": HandoverCheckSerializer(
                            sorted(
                                bu.handover_checks.all(),
                                key=lambda c: c.performed_at,
                            ),
                            many=True,
                        ).data,
                    }
                )
            items.append(
                {
                    "booking_item_id": item.booking_item_id,
                    "product_name": item.product.name if item.product else "",
                    "quantity": item.quantity_booked,
                    "units": units,
                }
            )

        return Response(
            {
                "booking_id": booking.booking_id,
                "booking_title": booking.booking_title,
                "status": booking.status,
                "client_name": _client_name(booking),
                "contact_name": booking.contact_name,
                "contact_phone": booking.contact_phone,
                "pickup_date": booking.pickup_date,
                "return_date": booking.return_date,
                "delivery_mode": booking.delivery_mode,
                "event_location": booking.event_location,
                "address": booking.address,
                "city": booking.city,
                "note_for_org": booking.note_for_org,
                "counts": _unit_counts(booking),
                "items": items,
            }
        )
