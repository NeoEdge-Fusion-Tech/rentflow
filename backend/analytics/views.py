"""Business analytics for one organization: money over time and the top
projects, clients, products and vendors for a date range."""

from collections import defaultdict
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from events.models import Event, ExpenseLineItem, VendorReview
from feedback.models import FeedbackAnswer, FeedbackResponse
from inventory.models import Booking, BookingItem
from payment.models import GeneralExpense, Invoice, Payment, Quotation
from users.models import Client
from users.permissions import HasModulePermission

BILLED = ("issued", "partially_paid", "paid")
ZERO = Decimal("0")
WEEKDAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]


def _num(v):
    return float(v or 0)


def _client_name(c):
    if c is None:
        return "No client"
    return (
        c.business_name
        or " ".join(p for p in [c.first_name, c.last_name] if p)
        or c.email
        or f"Client #{c.pk}"
    )


def _parse_date(s):
    try:
        return date.fromisoformat(s) if s else None
    except ValueError:
        return None


def _months(start, end):
    y, m = start.year, start.month
    while (y, m) <= (end.year, end.month):
        yield f"{y:04d}-{m:02d}"
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)


class Period:
    """A date range in the organization's time zone."""

    def __init__(self, start, end, tz):
        self.start, self.end, self.tz = start, end, tz
        self.start_dt = datetime.combine(start, time.min, tzinfo=tz)
        self.end_dt = datetime.combine(end + timedelta(days=1), time.min, tzinfo=tz)

    def local(self, dt):
        """Local calendar date of a datetime (or the date itself)."""
        if dt is None:
            return None
        if isinstance(dt, datetime):
            if timezone.is_naive(dt):
                dt = timezone.make_aware(dt, timezone.utc)
            return dt.astimezone(self.tz).date()
        return dt

    def has(self, d):
        return d is not None and self.start <= d <= self.end

    def previous(self):
        days = (self.end - self.start).days + 1
        return Period(
            self.start - timedelta(days=days), self.start - timedelta(days=1), self.tz
        )


def org_payments(org):
    """Completed payments, wherever the organization is recorded."""
    return Payment.objects.filter(
        Q(organization=org)
        | Q(booking__organization=org)
        | Q(invoice_record__organization=org),
        status="completed",
    ).distinct()


def money_totals(org, p):
    """Revenue (invoiced), cash collected, expenses and profit for a period."""
    invoices = Invoice.objects.filter(
        organization=org,
        status__in=BILLED,
        issue_date__gte=p.start_dt,
        issue_date__lt=p.end_dt,
    )
    revenue = sum((i.total_amount for i in invoices.only("total_amount")), ZERO)
    collected = sum(
        org_payments(org)
        .filter(payment_date__gte=p.start_dt, payment_date__lt=p.end_dt)
        .values_list("amount", flat=True),
        ZERO,
    )
    project_exp = general_exp = ZERO
    for amount, d, created in ExpenseLineItem.objects.filter(
        organization=org
    ).values_list("amount", "date", "created_at"):
        if p.has(d or p.local(created)):
            project_exp += amount or ZERO
    for amount, d, created in GeneralExpense.objects.filter(
        organization=org
    ).values_list("amount", "date", "created_at"):
        if p.has(d or p.local(created)):
            general_exp += amount or ZERO
    expenses = project_exp + general_exp
    bookings = sum(
        1
        for pick, made in Booking.objects.filter(organization=org)
        .exclude(status="cancelled")
        .values_list("pickup_date", "booking_date")
        if p.has(p.local(pick or made))
    )
    return {
        "revenue": revenue,
        "collected": collected,
        "project_expenses": project_exp,
        "general_expenses": general_exp,
        "expenses": expenses,
        "profit": revenue - expenses,
        "invoice_count": invoices.count(),
        "bookings": bookings,
    }


class AnalyticsOverviewView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    required_module = "reports"

    def get(self, request):
        org = getattr(request.user, "organization", None)
        if not org:
            return Response(
                {"error": "No organization associated with user"}, status=400
            )
        tz = org.tzinfo
        today = timezone.now().astimezone(tz).date()

        end = _parse_date(request.query_params.get("end")) or today
        start = _parse_date(request.query_params.get("start"))
        if not start:  # default: the last 12 months, whole months
            y, m = end.year, end.month - 11
            while m <= 0:
                y, m = y - 1, m + 12
            start = date(y, m, 1)
        if start > end:
            start, end = end, start
        p = Period(start, end, tz)

        cur = money_totals(org, p)
        prev = money_totals(org, p.previous())

        def change(key):
            a, b = cur[key], prev[key]
            if not b:
                return None
            return round(float((a - b) / abs(b) * 100), 1)

        # ---- Monthly series ------------------------------------------------
        months = {k: defaultdict(lambda: ZERO) for k in _months(start, end)}

        def bucket(d):
            return f"{d.year:04d}-{d.month:02d}" if p.has(d) else None

        invoices = list(
            Invoice.objects.filter(
                organization=org,
                status__in=BILLED,
                issue_date__gte=p.start_dt,
                issue_date__lt=p.end_dt,
            ).select_related("client")
        )
        for inv in invoices:
            k = bucket(p.local(inv.issue_date))
            if k:
                months[k]["revenue"] += inv.total_amount or ZERO
        for amount, dt in (
            org_payments(org)
            .filter(payment_date__gte=p.start_dt, payment_date__lt=p.end_dt)
            .values_list("amount", "payment_date")
        ):
            k = bucket(p.local(dt))
            if k:
                months[k]["collected"] += amount or ZERO
        for model in (ExpenseLineItem, GeneralExpense):
            for amount, d, created in model.objects.filter(
                organization=org
            ).values_list("amount", "date", "created_at"):
                k = bucket(d or p.local(created))
                if k:
                    months[k]["expenses"] += amount or ZERO
        monthly = []
        for k, v in months.items():
            monthly.append(
                {
                    "month": k,
                    "revenue": _num(v["revenue"]),
                    "collected": _num(v["collected"]),
                    "expenses": _num(v["expenses"]),
                    "profit": _num(v["revenue"] - v["expenses"]),
                }
            )
        active = [m for m in monthly if m["revenue"] or m["expenses"]]
        highlights = {
            "best_revenue_month": max(active, key=lambda m: m["revenue"], default=None),
            "best_profit_month": max(active, key=lambda m: m["profit"], default=None),
            "worst_month": min(active, key=lambda m: m["profit"], default=None),
            "loss_months": [m for m in active if m["profit"] < 0],
        }

        # ---- Top projects ---------------------------------------------------
        projects = []
        events = (
            Event.objects.filter(organization=org)
            .exclude(status="cancelled")
            .prefetch_related("invoices", "expenses")
        )
        for ev in events:
            d = ev.start_date or ev.end_date or p.local(ev.created_at)
            if not p.has(d):
                continue
            rev = sum(
                (i.total_amount for i in ev.invoices.all() if i.status in BILLED), ZERO
            )
            exp = sum((e.amount for e in ev.expenses.all()), ZERO)
            projects.append(
                {
                    "id": ev.pk,
                    "name": ev.name,
                    "status": ev.status,
                    "date": d,
                    "revenue": _num(rev),
                    "expenses": _num(exp),
                    "profit": _num(rev - exp),
                    "margin": round(float((rev - exp) / rev * 100), 1) if rev else None,
                }
            )
        projects.sort(key=lambda x: x["profit"], reverse=True)

        # ---- Top clients ----------------------------------------------------
        clients = {}
        for inv in invoices:
            key = inv.client_id or 0
            c = clients.setdefault(
                key,
                {
                    "id": inv.client_id,
                    "name": _client_name(inv.client),
                    "billed": ZERO,
                    "paid": ZERO,
                    "invoices": 0,
                    "bookings": 0,
                },
            )
            c["billed"] += inv.total_amount or ZERO
            c["paid"] += inv.amount_paid or ZERO
            c["invoices"] += 1
        bookings = list(
            Booking.objects.filter(organization=org)
            .exclude(status="cancelled")
            .select_related("client")
        )
        in_range_bookings = [
            b for b in bookings if p.has(p.local(b.pickup_date or b.booking_date))
        ]
        for b in in_range_bookings:
            if b.client_id and b.client_id in clients:
                clients[b.client_id]["bookings"] += 1
        top_clients = sorted(
            (
                {
                    **c,
                    "billed": _num(c["billed"]),
                    "paid": _num(c["paid"]),
                    "outstanding": _num(c["billed"] - c["paid"]),
                }
                for k, c in clients.items()
                if k
            ),
            key=lambda c: c["billed"],
            reverse=True,
        )

        # ---- Top rented products -------------------------------------------
        products = {}
        booking_ids = {b.booking_id for b in in_range_bookings}
        for item in BookingItem.objects.filter(
            booking_id__in=booking_ids
        ).select_related("product"):
            pr = products.setdefault(
                item.product_id,
                {
                    "id": item.product_id,
                    "name": item.product.name,
                    "quantity": 0,
                    "bookings": set(),
                    "revenue": ZERO,
                },
            )
            pr["quantity"] += item.quantity_booked or 0
            pr["bookings"].add(item.booking_id)
            pr["revenue"] += item.total_price or ZERO
        top_products = sorted(
            (
                {**v, "bookings": len(v["bookings"]), "revenue": _num(v["revenue"])}
                for v in products.values()
            ),
            key=lambda v: (v["bookings"], v["quantity"]),
            reverse=True,
        )

        # ---- Top vendors ----------------------------------------------------
        vendors = {}

        def add_vendor(vendor, amount, event_id=None):
            v = vendors.setdefault(
                vendor.vendor_id,
                {
                    "id": vendor.vendor_id,
                    "name": vendor.business_name,
                    "service": vendor.service,
                    "spend": ZERO,
                    "projects": set(),
                },
            )
            v["spend"] += amount or ZERO
            if event_id:
                v["projects"].add(event_id)

        for e in ExpenseLineItem.objects.filter(
            organization=org, vendor__isnull=False
        ).select_related("vendor"):
            if p.has(e.date or p.local(e.created_at)):
                add_vendor(e.vendor, e.amount, e.event_id)
        for e in GeneralExpense.objects.filter(
            organization=org, vendor__isnull=False
        ).select_related("vendor"):
            if p.has(e.date or p.local(e.created_at)):
                add_vendor(e.vendor, e.amount)
        reviews = defaultdict(list)
        for r in VendorReview.objects.filter(
            organization=org, vendor_id__in=vendors.keys()
        ):
            reviews[r.vendor_id].append(r)
        top_vendors = []
        for vid, v in vendors.items():
            rs = reviews.get(vid, [])
            top_vendors.append(
                {
                    **v,
                    "spend": _num(v["spend"]),
                    "projects": len(v["projects"]),
                    "reviews": len(rs),
                    "rating": (
                        round(sum(r.rating for r in rs) / len(rs), 1) if rs else None
                    ),
                    "on_time_rate": (
                        round(
                            100
                            * sum(
                                1 for r in rs if r.punctuality in ("early", "on_time")
                            )
                            / len(rs)
                        )
                        if rs
                        else None
                    ),
                }
            )
        top_vendors.sort(key=lambda v: v["spend"], reverse=True)

        # ---- Other insights -------------------------------------------------
        now = timezone.now()
        open_invoices = Invoice.objects.filter(
            organization=org, status__in=("issued", "partially_paid")
        )
        outstanding = overdue = ZERO
        overdue_count = 0
        for inv in open_invoices:
            due = (inv.total_amount or ZERO) - (inv.amount_paid or ZERO)
            if due <= 0:
                continue
            outstanding += due
            if inv.due_date and inv.due_date < now:
                overdue += due
                overdue_count += 1

        invoice_status = defaultdict(lambda: {"count": 0, "amount": ZERO})
        for st, amt in (
            Invoice.objects.filter(
                organization=org, issue_date__gte=p.start_dt, issue_date__lt=p.end_dt
            )
            .exclude(status="draft")
            .values_list("status", "total_amount")
        ):
            invoice_status[st]["count"] += 1
            invoice_status[st]["amount"] += amt or ZERO

        booking_status = defaultdict(int)
        event_types = defaultdict(lambda: {"bookings": 0, "revenue": ZERO})
        weekdays = defaultdict(int)
        for b in bookings:
            d = p.local(b.pickup_date or b.booking_date)
            if not p.has(d):
                continue
            booking_status[b.status] += 1
            et = (b.event_type or "").strip() or "Other"
            event_types[et]["bookings"] += 1
            event_types[et]["revenue"] += b.total_amount or ZERO
            weekdays[WEEKDAYS[d.weekday()]] += 1

        quotes = Quotation.objects.filter(
            organization=org, issue_date__gte=p.start_dt, issue_date__lt=p.end_dt
        ).exclude(status__in=("draft", "cancelled"))
        quotes_sent = quotes.count()
        quotes_won = quotes.filter(status__in=("accepted", "converted")).count()

        fb = FeedbackResponse.objects.filter(
            project_feedback__event__organization=org,
            submitted_at__gte=p.start_dt,
            submitted_at__lt=p.end_dt,
        )
        ratings = list(
            FeedbackAnswer.objects.filter(
                response__in=fb,
                question__question_type="RATING",
                answer_rating__isnull=False,
            ).values_list("answer_rating", flat=True)
        )

        new_clients = sum(
            1
            for c in Client.objects.filter(organization=org).values_list(
                "created_at", flat=True
            )
            if p.has(p.local(c))
        )
        revenue = cur["revenue"]
        totals = {
            **{k: _num(v) if isinstance(v, Decimal) else v for k, v in cur.items()},
            "margin": (
                round(float(cur["profit"] / revenue * 100), 1) if revenue else None
            ),
            "collection_rate": (
                round(float(cur["collected"] / revenue * 100), 1) if revenue else None
            ),
            "average_invoice": (
                _num(revenue / cur["invoice_count"]) if cur["invoice_count"] else 0
            ),
            "outstanding": _num(outstanding),
            "overdue": _num(overdue),
            "overdue_count": overdue_count,
            "projects": len(projects),
            "new_clients": new_clients,
        }
        changes = {
            k: change(k)
            for k in ("revenue", "collected", "expenses", "profit", "bookings")
        }

        currency = getattr(org, "currency", None)
        return Response(
            {
                "range": {"start": start, "end": end},
                "currency": {
                    "code": getattr(currency, "code", "") or "",
                    "symbol": getattr(currency, "symbol", "") or "",
                },
                "totals": totals,
                "changes": changes,
                "monthly": monthly,
                "highlights": highlights,
                "top_projects": projects[:10],
                "bottom_projects": sorted(projects, key=lambda x: x["profit"])[:5],
                "top_clients": top_clients[:10],
                "top_products": top_products[:10],
                "top_vendors": top_vendors[:10],
                "invoice_status": [
                    {"status": k, "count": v["count"], "amount": _num(v["amount"])}
                    for k, v in invoice_status.items()
                ],
                "booking_status": [
                    {"status": k, "count": v} for k, v in booking_status.items()
                ],
                "event_types": sorted(
                    (
                        {
                            "event_type": k,
                            "bookings": v["bookings"],
                            "revenue": _num(v["revenue"]),
                        }
                        for k, v in event_types.items()
                    ),
                    key=lambda x: x["revenue"],
                    reverse=True,
                )[:8],
                "weekdays": [
                    {"day": d, "bookings": weekdays.get(d, 0)} for d in WEEKDAYS
                ],
                "quotes": {
                    "sent": quotes_sent,
                    "won": quotes_won,
                    "win_rate": (
                        round(100 * quotes_won / quotes_sent) if quotes_sent else None
                    ),
                },
                "feedback": {
                    "responses": fb.count(),
                    "average_rating": (
                        round(sum(ratings) / len(ratings), 2) if ratings else None
                    ),
                    "satisfaction": (
                        round(100 * sum(1 for r in ratings if r >= 4) / len(ratings))
                        if ratings
                        else None
                    ),
                },
            }
        )
