from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PaymentViewSet, InvoiceViewSet, ReceiptViewSet, PaystackWebhookView,
    SubscriptionPaymentViewSet, SuperAdminRevenueAPIView, OrganizationSubscriptionAPIView
)

router = DefaultRouter()
router.register(r'payments', PaymentViewSet)
router.register(r'invoices', InvoiceViewSet)
router.register(r'receipts', ReceiptViewSet)
router.register(r'subscription-payments', SubscriptionPaymentViewSet, basename='subscription-payments')

urlpatterns = [
    path('webhook/paystack/', PaystackWebhookView.as_view(), name='paystack-webhook'),
    path('super-admin/revenue/', SuperAdminRevenueAPIView.as_view(), name='super-admin-revenue'),
    path('organization/subscription/', OrganizationSubscriptionAPIView.as_view(), name='organization-subscription'),
    path('', include(router.urls)),
]
