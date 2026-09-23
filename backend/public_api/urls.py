from django.urls import path
from .views import (
    PublicProductListView,
    PublicBookingSettingsView,
    PublicBookingRequestView,
    GlobalMarketplaceProductListView,
)
from .client_auth import (
    ClientLoginView,
    ClientRegisterView,
    ClientBookingsView,
    ClientQuotationsView,
)

urlpatterns = [
    path(
        "marketplace/products/",
        GlobalMarketplaceProductListView.as_view(),
        name="global-marketplace-products",
    ),
    path(
        "organizations/<str:identifier>/products/",
        PublicProductListView.as_view(),
        name="public-product-list",
    ),
    path(
        "organizations/<str:identifier>/availability/",
        PublicBookingSettingsView.as_view(),
        name="public-booking-settings",
    ),
    path(
        "organizations/<str:identifier>/booking-requests/",
        PublicBookingRequestView.as_view(),
        name="public-booking-request",
    ),
    path(
        "organizations/<str:identifier>/client/login/",
        ClientLoginView.as_view(),
        name="public-client-login",
    ),
    path(
        "organizations/<str:identifier>/client/register/",
        ClientRegisterView.as_view(),
        name="public-client-register",
    ),
    path(
        "organizations/<str:identifier>/client/bookings/",
        ClientBookingsView.as_view(),
        name="public-client-bookings",
    ),
    path(
        "organizations/<str:identifier>/client/quotations/",
        ClientQuotationsView.as_view(),
        name="public-client-quotations",
    ),
]
