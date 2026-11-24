from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProductCategoryViewSet,
    ProductViewSet,
    ProductUnitViewSet,
    BookingViewSet,
    BookingItemViewSet,
    BookingItemUnitViewSet,
    TenantStatsAPIView,
    ScanItemAPIView,
    OrganizationBookingSettingsAPIView,
    MarketplaceTagViewSet,
    HandoverCheckViewSet,
)

from .validation_views import ValidationBookingDetailView, ValidationBookingListView

router = DefaultRouter()
router.register(r"categories", ProductCategoryViewSet)
router.register(r"marketplace-tags", MarketplaceTagViewSet)
router.register(r"products", ProductViewSet)
router.register(r"units", ProductUnitViewSet)
router.register(r"bookings", BookingViewSet)
router.register(r"booking-items", BookingItemViewSet)
router.register(r"booking-item-units", BookingItemUnitViewSet)
router.register(r"handover-checks", HandoverCheckViewSet)

urlpatterns = [
    path("stats/", TenantStatsAPIView.as_view(), name="tenant-stats"),
    path("scan/", ScanItemAPIView.as_view(), name="scan-item"),
    path(
        "validation/bookings/",
        ValidationBookingListView.as_view(),
        name="validation-bookings",
    ),
    path(
        "validation/bookings/<int:pk>/",
        ValidationBookingDetailView.as_view(),
        name="validation-booking-detail",
    ),
    path(
        "booking-settings/",
        OrganizationBookingSettingsAPIView.as_view(),
        name="booking-settings",
    ),
    path("", include(router.urls)),
]
