from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import FileResponse
import django_filters.rest_framework as django_filters

from users.mixins import TenantIsolationMixin
from .models import Event, ExpenseLineItem, ChecklistTask
from .serializers import EventSerializer, ExpenseLineItemSerializer, ChecklistTaskSerializer
from .utils import generate_checklist_pdf


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
