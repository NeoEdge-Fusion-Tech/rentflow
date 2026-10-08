from django.apps import apps
from django.contrib import admin
from .models import Product, Booking, OrganizationBookingSettings


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "organization",
        "available_for_rental",
        "is_active",
        "total_quantity_good_condition_available",
    )
    list_filter = ("available_for_rental", "is_active", "organization")
    search_fields = ("name", "description")


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "booking_id",
        "booking_title",
        "organization",
        "client",
        "status",
        "event_type",
        "setup_date",
    )
    list_filter = ("status", "event_type", "organization")
    search_fields = (
        "booking_title",
        "client__first_name",
        "client__last_name",
        "contact_name",
    )


@admin.register(OrganizationBookingSettings)
class OrganizationBookingSettingsAdmin(admin.ModelAdmin):
    list_display = ("organization", "is_accepting_requests", "open_time", "close_time")
    list_filter = ("is_accepting_requests",)


app = apps.get_app_config("inventory")
for model_name, model in app.models.items():
    try:
        admin.site.register(model)
    except admin.sites.AlreadyRegistered:
        pass
