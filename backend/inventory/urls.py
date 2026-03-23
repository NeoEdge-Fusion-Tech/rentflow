from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProductCategoryViewSet, ProductViewSet, ProductUnitViewSet,
    BookingViewSet, BookingItemViewSet, BookingItemUnitViewSet,
    TenantStatsAPIView, ScanItemAPIView
)

router = DefaultRouter()
router.register(r'categories', ProductCategoryViewSet)
router.register(r'products', ProductViewSet)
router.register(r'units', ProductUnitViewSet)
router.register(r'bookings', BookingViewSet)
router.register(r'booking-items', BookingItemViewSet)
router.register(r'booking-item-units', BookingItemUnitViewSet)

urlpatterns = [
    path('stats/', TenantStatsAPIView.as_view(), name='tenant-stats'),
    path('scan/', ScanItemAPIView.as_view(), name='scan-item'),
    path('', include(router.urls)),
]
