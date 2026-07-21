from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EventViewSet, ExpenseLineItemViewSet, ChecklistTaskViewSet

router = DefaultRouter()
router.register(r'events', EventViewSet, basename='event')
router.register(r'expenses', ExpenseLineItemViewSet, basename='expense')
router.register(r'checklist-tasks', ChecklistTaskViewSet, basename='checklisttask')

urlpatterns = [
    path('', include(router.urls)),
]
