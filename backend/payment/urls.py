from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet, InvoiceViewSet, ReceiptViewSet

router = DefaultRouter()
router.register(r'payments', PaymentViewSet)
router.register(r'invoices', InvoiceViewSet)
router.register(r'receipts', ReceiptViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
