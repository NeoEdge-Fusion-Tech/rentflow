from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404

from .models import FeedbackForm, ProjectFeedback, FeedbackResponse
from .serializers import (
    FeedbackFormSerializer,
    ProjectFeedbackSerializer,
    FeedbackResponseSerializer,
)

class FeedbackFormViewSet(viewsets.ModelViewSet):
    serializer_class = FeedbackFormSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FeedbackForm.objects.filter(organization=self.request.user.organization)


class ProjectFeedbackViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectFeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ProjectFeedback.objects.filter(event__organization=self.request.user.organization)

    @action(detail=True, methods=['get'])
    def responses(self, request, pk=None):
        project_feedback = self.get_object()
        responses = FeedbackResponse.objects.filter(project_feedback=project_feedback)
        serializer = FeedbackResponseSerializer(responses, many=True)
        return Response(serializer.data)


class PublicFeedbackViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def retrieve(self, request, pk=None):
        """Fetch form details by UUID (pk is UUID)"""
        project_feedback = get_object_or_404(ProjectFeedback, public_id=pk, is_active=True)
        serializer = ProjectFeedbackSerializer(project_feedback)
        return Response(serializer.data)

    def create(self, request):
        """Submit a response"""
        serializer = FeedbackResponseSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
