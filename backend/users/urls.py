from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    OrganizationViewSet, SubscriptionViewSet, OrganizationAccountDetailsViewSet, 
    UserViewSet, ClientViewSet, SuperAdminStatsAPIView, RegisterAPIView,
    VerifyEmailAPIView, TriggerPasswordResetAPIView, SetNewPasswordAPIView,
    SuperAdminOrganizationViewSet, SuperAdminUserViewSet, MeAPIView, CurrencyViewSet
)

router = DefaultRouter()
router.register(r'currencies', CurrencyViewSet, basename='currency')
router.register(r'organizations', OrganizationViewSet, basename='organization')
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
router.register(r'organization-account-details', OrganizationAccountDetailsViewSet, basename='organizationaccountdetails')
router.register(r'team', UserViewSet, basename='team')
router.register(r'clients', ClientViewSet, basename='client')
router.register(r'superadmin/organizations', SuperAdminOrganizationViewSet, basename='superadmin-organizations')
router.register(r'superadmin/users', SuperAdminUserViewSet, basename='superadmin-users')

urlpatterns = [
    path('me/', MeAPIView.as_view(), name='user-me'),
    path('register/', RegisterAPIView.as_view(), name='register'),
    path('verify-email/', VerifyEmailAPIView.as_view(), name='verify-email'),
    path('password-reset/trigger/', TriggerPasswordResetAPIView.as_view(), name='trigger-password-reset'),
    path('password-reset/set/', SetNewPasswordAPIView.as_view(), name='set-password-reset'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('superadmin/stats/', SuperAdminStatsAPIView.as_view(), name='superadmin-stats'),
    path('', include(router.urls)),
]
