import datetime
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
from .models import Event, ExpenseLineItem, ChecklistTask
from .serializers import EventSerializer, ExpenseLineItemSerializer, ChecklistTaskSerializer
from .utils import generate_checklist_pdf, compute_period_totals


def _resolve_organization(request):
    """
    Returns the Organization to scope P&L dashboard stats to, or an error
    Response if none can be determined (mirrors TenantStatsAPIView's pattern
    in inventory/views.py).
    """
    user = request.user
    if user.is_superuser:
        org_id = request.query_params.get('organization')
        if not org_id:
            return Response({'error': 'Superuser must specify an organization ID'}, status=400)
        from users.models import Organization
        try:
            return Organization.objects.get(id=org_id)
        except Organization.DoesNotExist:
            return Response({'error': 'Organization not found'}, status=404)
    if hasattr(user, 'organization') and user.organization:
        return user.organization
    return Response({'error': 'No organization associated with user'}, status=400)


class EventDashboardStatsAPIView(APIView):
    """
    Org-wide Profit & Loss totals across all Events for a given period.
    ?period=today|month|year (default month) and ?year=YYYY (used only when
    period=year; defaults to the current year).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = _resolve_organization(request)
        if isinstance(organization, Response):
            return organization

        period = request.query_params.get('period', 'month')
        now = timezone.now()

        if period == 'today':
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + datetime.timedelta(days=1)
        elif period == 'year':
            year = int(request.query_params.get('year', now.year))
            start = datetime.datetime(year, 1, 1, tzinfo=datetime.timezone.utc)
            end = datetime.datetime(year + 1, 1, 1, tzinfo=datetime.timezone.utc)
        else:
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end = start + relativedelta(months=1)

        total_revenue, total_expenses, total_profit, total_loss = compute_period_totals(organization, start, end)

        return Response({
            'period': period,
            'total_revenue': total_revenue,
            'total_expenses': total_expenses,
            'total_profit': total_profit,
            'total_loss': total_loss,
        })


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

        year = int(request.query_params.get('year', timezone.now().year))

        results = []
        for month in range(1, 13):
            start = datetime.datetime(year, month, 1, tzinfo=datetime.timezone.utc)
            end = start + relativedelta(months=1)
            revenue, expenses, _, _ = compute_period_totals(organization, start, end)
            results.append({
                'month': month,
                'label': start.strftime('%b'),
                'revenue': revenue,
                'expenses': expenses,
                'profit': revenue - expenses,
            })

        return Response(results)


class EventViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    filter_backends = [django_filters.DjangoFilterBackend]
    filterset_fields = ['status']

    def perform_create(self, serializer):
        user = self.request.user
        kwargs = {'created_by': user, 'updated_by': user}
        if not user.is_superuser:
            kwargs['organization'] = user.organization
        serializer.save(**kwargs)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class ExpenseLineItemViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = ExpenseLineItem.objects.all()
    serializer_class = ExpenseLineItemSerializer
    filter_backends = [django_filters.DjangoFilterBackend]
    filterset_fields = ['event', 'expense_type']

    def perform_create(self, serializer):
        user = self.request.user
        kwargs = {'created_by': user}
        if not user.is_superuser:
            kwargs['organization'] = user.organization
        serializer.save(**kwargs)


class ChecklistTaskViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = ChecklistTask.objects.all()
    serializer_class = ChecklistTaskSerializer
    filter_backends = [django_filters.DjangoFilterBackend]
    filterset_fields = ['event', 'checklist_type']

    def get_queryset(self):
        # Top-level tasks only; subtasks are nested under each via the serializer.
        return super().get_queryset().filter(parent_task__isnull=True)

    def perform_create(self, serializer):
        user = self.request.user
        kwargs = {'created_by': user}
        if not user.is_superuser:
            kwargs['organization'] = user.organization
        serializer.save(**kwargs)

    @action(detail=False, methods=['post'])
    def duplicate(self, request):
        user = request.user
        org = user.organization
        source_event_id = request.data.get('source_event')
        target_event_id = request.data.get('target_event')
        if not source_event_id or not target_event_id:
            return Response({"error": "source_event and target_event are required."}, status=400)

        if not Event.objects.filter(pk=source_event_id, organization=org).exists():
            return Response({"error": "Source event not found."}, status=404)
        if not Event.objects.filter(pk=target_event_id, organization=org).exists():
            return Response({"error": "Target event not found."}, status=404)

        source_tasks = ChecklistTask.objects.filter(event_id=source_event_id, parent_task__isnull=True)

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

        serializer = ChecklistTaskSerializer(created, many=True, context={'request': request})
        return Response(serializer.data, status=201)

    @action(detail=False, methods=['get'])
    def download(self, request):
        event_id = request.query_params.get('event_id')
        if not event_id:
            return Response({"error": "event_id is required."}, status=400)

        org = request.user.organization
        event = Event.objects.filter(pk=event_id, organization=org).first()
        if not event:
            return Response({"error": "Event not found."}, status=404)

        tasks = ChecklistTask.objects.filter(event=event, parent_task__isnull=True)
        pdf_buffer = generate_checklist_pdf(event, tasks)
        filename = f"checklist_{event.name.replace(' ', '_')}.pdf"
        return FileResponse(pdf_buffer, as_attachment=True, filename=filename, content_type='application/pdf')
