from django.apps import apps
from django.contrib import admin
from django.db.models import Q
from .models import Waitlist, Client


@admin.register(Waitlist)
class WaitlistAdmin(admin.ModelAdmin):
    list_display = (
        "first_name",
        "last_name",
        "email",
        "company",
        "referral_type",
        "created_at",
    )
    list_filter = ("referral_type", "created_at")
    search_fields = ("first_name", "last_name", "email", "company")
    readonly_fields = ("created_at",)


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = (
        "client_id",
        "business_name",
        "first_name",
        "last_name",
        "email",
        "contact_email",
        "status",
        "organization",
    )
    search_fields = (
        "first_name",
        "last_name",
        "email",
        "business_name",
        "contact_email",
    )
    list_filter = ("status", "client_type", "created_at")

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.exclude(
            Q(email__iexact="sunnexajayi@gmail.com")
            | Q(contact_email__iexact="sunnexajayi@gmail.com")
        )


app = apps.get_app_config("users")
for model_name, model in app.models.items():
    try:
        admin.site.register(model)
    except admin.sites.AlreadyRegistered:
        pass
