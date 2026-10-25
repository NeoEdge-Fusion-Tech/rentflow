import datetime
from django.db import models as django_models
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse
from django.utils import timezone
from dateutil.relativedelta import relativedelta
import django_filters.rest_framework as django_filters

from users.mixins import TenantIsolationMixin
from .models import Event, ExpenseLineItem, ChecklistTask, VendorReview
from .serializers import (
    EventSerializer,
    ExpenseLineItemSerializer,
    ChecklistTaskSerializer,
    VendorReviewSerializer,
)
from .utils import generate_checklist_pdf, compute_period_totals
from config.pagination import StandardResultsSetPagination
from config.filters import DateRangeOrderingFilter
from rest_framework import filters as drf_filters


def _resolve_organization(request):
    """
    Returns the Organization to scope P&L dashboard stats to, or an error
    Response if none can be determined (mirrors TenantStatsAPIView's pattern
    in inventory/views.py).
    """
    user = request.user
    if user.is_superuser:
        org_id = request.query_params.get("organization")
        if not org_id:
            return Response(
                {"error": "Superuser must specify an organization ID"}, status=400
            )
        from users.models import Organization

        try:
            return Organization.objects.get(id=org_id)
        except Organization.DoesNotExist:
            return Response({"error": "Organization not found"}, status=404)
    if hasattr(user, "organization") and user.organization:
        return user.organization
    return Response({"error": "No organization associated with user"}, status=400)


class EventDashboardStatsAPIView(APIView):
    """
    Org-wide Profit & Loss totals across all Events for a given period.
    ?period=today|month|year|custom (default month) and ?year=YYYY (used only
    when period=year; defaults to the current year). period=custom takes
    ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD (both inclusive).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = _resolve_organization(request)
        if isinstance(organization, Response):
            return organization

        period = request.query_params.get("period", "month")
        now = timezone.now()

        if period == "custom":
            try:
                start_d = datetime.date.fromisoformat(
                    request.query_params.get("start_date", "")
                )
                end_d = datetime.date.fromisoformat(
                    request.query_params.get("end_date", "")
                )
            except ValueError:
                return Response(
                    {"error": "start_date and end_date must be YYYY-MM-DD."},
                    status=400,
                )
            if end_d < start_d:
                return Response(
                    {"error": "end_date must be on or after start_date."},
                    status=400,
                )
            start = datetime.datetime.combine(
                start_d, datetime.time.min, tzinfo=datetime.timezone.utc
            )
            end = datetime.datetime.combine(
                end_d + datetime.timedelta(days=1),
                datetime.time.min,
                tzinfo=datetime.timezone.utc,
            )
        elif period == "today":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + datetime.timedelta(days=1)
        elif period == "year":
            year = int(request.query_params.get("year", now.year))
            start = datetime.datetime(year, 1, 1, tzinfo=datetime.timezone.utc)
            end = datetime.datetime(year + 1, 1, 1, tzinfo=datetime.timezone.utc)
        else:
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end = start + relativedelta(months=1)

        currency_totals = compute_period_totals(organization, start, end)

        return Response(
            {
                "period": period,
                "currencies": currency_totals,
            }
        )


class EventMonthlyBreakdownAPIView(APIView):
    """
    Month-by-month revenue/expenses/profit across all of an org's Events for
    ?year=YYYY (defaults to the current year) — feeds the dashboard bar chart.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = _resolve_organization(request)
        if isinstance(organization, Response):
            return organization

        year = int(request.query_params.get("year", timezone.now().year))

        results = []
        for month in range(1, 13):
            start = datetime.datetime(year, month, 1, tzinfo=datetime.timezone.utc)
            end = start + relativedelta(months=1)
            currency_totals = compute_period_totals(organization, start, end)

            # Group by currency inside the month
            results.append(
                {
                    "month": month,
                    "label": start.strftime("%b"),
                    "currencies": currency_totals,
                }
            )

        return Response(results)


class EventViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [django_filters.DjangoFilterBackend]
    filterset_fields = ["status"]

    def perform_create(self, serializer):
        user = self.request.user
        kwargs = {"created_by": user, "updated_by": user}
        if not user.is_superuser:
            kwargs["organization"] = user.organization
        serializer.save(**kwargs)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class ExpenseLineItemViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = ExpenseLineItem.objects.all()
    serializer_class = ExpenseLineItemSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [django_filters.DjangoFilterBackend]
    filterset_fields = ["event", "expense_type"]

    def perform_create(self, serializer):
        user = self.request.user
        kwargs = {"created_by": user}
        if not user.is_superuser:
            kwargs["organization"] = user.organization
        serializer.save(**kwargs)

    @action(detail=False, methods=["post"])
    def duplicate(self, request):
        user = request.user
        org = user.organization
        target_event_id = request.data.get("target_event")
        source_event_id = request.data.get("source_event")
        source_expense_id = request.data.get("source_expense")

        if not target_event_id:
            return Response({"error": "target_event is required."}, status=400)

        if not Event.objects.filter(pk=target_event_id, organization=org).exists():
            return Response({"error": "Target event not found."}, status=404)

        expenses_to_copy = []

        if source_expense_id:
            expense = ExpenseLineItem.objects.filter(
                pk=source_expense_id, organization=org
            ).first()
            if not expense:
                return Response({"error": "Source expense not found."}, status=404)
            expenses_to_copy = [expense]
        elif source_event_id:
            if not Event.objects.filter(pk=source_event_id, organization=org).exists():
                return Response({"error": "Source event not found."}, status=404)
            expenses_to_copy = list(
                ExpenseLineItem.objects.filter(event_id=source_event_id)
            )
        else:
            return Response(
                {"error": "Either source_event or source_expense is required."},
                status=400,
            )

        created = []
        for expense in expenses_to_copy:
            new_expense = ExpenseLineItem.objects.create(
                event_id=target_event_id,
                organization=org,
                expense_type=expense.expense_type,
                vendor=expense.vendor,
                name=expense.name,
                amount=expense.amount,
                description=expense.description,
                date=expense.date,
                created_by=user,
            )
            created.append(new_expense)

        serializer = ExpenseLineItemSerializer(
            created, many=True, context={"request": request}
        )
        return Response(serializer.data, status=201)


class ChecklistTaskViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = ChecklistTask.objects.all()
    serializer_class = ChecklistTaskSerializer
    filter_backends = [django_filters.DjangoFilterBackend]
    filterset_fields = ["event", "checklist_type"]

    def get_queryset(self):
        # Top-level tasks only; subtasks are nested under each via the serializer.
        return super().get_queryset().filter(parent_task__isnull=True)

    def perform_create(self, serializer):
        user = self.request.user
        kwargs = {"created_by": user}
        if not user.is_superuser:
            kwargs["organization"] = user.organization
        serializer.save(**kwargs)

    @action(detail=False, methods=["post"])
    def duplicate(self, request):
        user = request.user
        org = user.organization
        source_event_id = request.data.get("source_event")
        target_event_id = request.data.get("target_event")
        if not source_event_id or not target_event_id:
            return Response(
                {"error": "source_event and target_event are required."}, status=400
            )

        if not Event.objects.filter(pk=source_event_id, organization=org).exists():
            return Response({"error": "Source event not found."}, status=404)
        if not Event.objects.filter(pk=target_event_id, organization=org).exists():
            return Response({"error": "Target event not found."}, status=404)

        source_tasks = ChecklistTask.objects.filter(
            event_id=source_event_id, parent_task__isnull=True
        )

        created = []
        for task in source_tasks:
            new_task = ChecklistTask.objects.create(
                event_id=target_event_id,
                organization=org,
                checklist_type=task.checklist_type,
                name=task.name,
                description=task.description,
                due_date=None,
                is_done=False,
                position=task.position,
                created_by=user,
            )
            created.append(new_task)
            for sub in task.subtasks.all():
                ChecklistTask.objects.create(
                    event_id=target_event_id,
                    organization=org,
                    checklist_type=sub.checklist_type,
                    parent_task=new_task,
                    name=sub.name,
                    description=sub.description,
                    due_date=None,
                    is_done=False,
                    position=sub.position,
                    created_by=user,
                )

        serializer = ChecklistTaskSerializer(
            created, many=True, context={"request": request}
        )
        return Response(serializer.data, status=201)

    @action(detail=False, methods=["get"])
    def download(self, request):
        event_id = request.query_params.get("event_id")
        if not event_id:
            return Response({"error": "event_id is required."}, status=400)

        org = request.user.organization
        event = Event.objects.filter(pk=event_id, organization=org).first()
        if not event:
            return Response({"error": "Event not found."}, status=404)

        tasks = ChecklistTask.objects.filter(event=event, parent_task__isnull=True)
        pdf_buffer = generate_checklist_pdf(event, tasks)
        filename = f"checklist_{event.name.replace(' ', '_')}.pdf"
        return FileResponse(
            pdf_buffer,
            as_attachment=True,
            filename=filename,
            content_type="application/pdf",
        )


def pending_vendor_reviews(organization):
    """Vendors used on a finished project (completed, or past its end date,
    and not cancelled) who haven't been reviewed for that project yet."""
    today = timezone.localdate()
    finished = (
        Event.objects.filter(organization=organization)
        .exclude(status="cancelled")
        .filter(
            django_models.Q(status="completed") | django_models.Q(end_date__lt=today)
        )
    )
    reviewed = set(
        VendorReview.objects.filter(event__in=finished).values_list(
            "event_id", "vendor_id"
        )
    )
    rows = (
        ExpenseLineItem.objects.filter(event__in=finished, vendor__isnull=False)
        .values(
            "event_id",
            "event__name",
            "event__end_date",
            "vendor_id",
            "vendor__business_name",
            "vendor__service",
        )
        .distinct()
        .order_by("-event__end_date", "event_id", "vendor__business_name")
    )
    pending = []
    for r in rows:
        if (r["event_id"], r["vendor_id"]) in reviewed:
            continue
        pending.append(
            {
                "event": r["event_id"],
                "event_name": r["event__name"],
                "event_end_date": r["event__end_date"],
                "vendor": r["vendor_id"],
                "vendor_name": r["vendor__business_name"],
                "vendor_service": r["vendor__service"],
            }
        )
    return pending


class VendorReviewViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    """Vendor performance reviews per project.
    Filters: ?event, ?vendor, ?punctuality, ?rating, ?search (vendor, project,
    comment), date range + ordering (see config.filters)."""

    queryset = VendorReview.objects.select_related("vendor", "event", "created_by")
    serializer_class = VendorReviewSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [
        django_filters.DjangoFilterBackend,
        drf_filters.SearchFilter,
        DateRangeOrderingFilter,
    ]
    filterset_fields = ["event", "vendor", "punctuality", "rating"]
    search_fields = [
        "vendor__business_name",
        "vendor__service",
        "event__name",
        "comment",
    ]
    date_filter_fields = {
        "created": {"field": "created_at"},
        "updated": {"field": "updated_at"},
    }

    def perform_create(self, serializer):
        user = self.request.user
        kwargs = {"created_by": user}
        if not user.is_superuser:
            kwargs["organization"] = user.organization
        serializer.save(**kwargs)

    @action(detail=False, methods=["get"])
    def pending(self, request):
        """Reviews still to do: [{event, event_name, vendor, vendor_name…}]."""
        org = getattr(request.user, "organization", None)
        if org is None:
            return Response([])
        data = pending_vendor_reviews(org)
        event = request.query_params.get("event")
        if event and event.isdigit():
            data = [p for p in data if p["event"] == int(event)]
        return Response(data)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Average rating, review count and punctuality breakdown per vendor."""
        from django.db.models import Avg, Count, Q

        qs = self.filter_queryset(self.get_queryset())
        rows = (
            qs.values("vendor_id")
            .annotate(
                avg_rating=Avg("rating"),
                reviews=Count("review_id"),
                early=Count("review_id", filter=Q(punctuality="early")),
                on_time=Count("review_id", filter=Q(punctuality="on_time")),
                late=Count("review_id", filter=Q(punctuality="late")),
                no_show=Count("review_id", filter=Q(punctuality="no_show")),
            )
            .order_by()
        )
        return Response(
            {
                str(r["vendor_id"]): {
                    **r,
                    "avg_rating": round(float(r["avg_rating"] or 0), 1),
                }
                for r in rows
            }
        )
