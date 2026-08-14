from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EventViewSet,
    ExpenseLineItemViewSet,
    ChecklistTaskViewSet,
    EventDashboardStatsAPIView,
    EventMonthlyBreakdownAPIView,
)

router = DefaultRouter()
router.register(r"events", EventViewSet, basename="event")
router.register(r"expenses", ExpenseLineItemViewSet, basename="expense")
router.register(r"checklist-tasks", ChecklistTaskViewSet, basename="checklisttask")

urlpatterns = [
    path(
        "dashboard-stats/",
        EventDashboardStatsAPIView.as_view(),
        name="event-dashboard-stats",
    ),
    path(
        "monthly-breakdown/",
        EventMonthlyBreakdownAPIView.as_view(),
        name="event-monthly-breakdown",
    ),
    path("", include(router.urls)),
]
