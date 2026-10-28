from django.apps import apps
from django.contrib import admin
from .models import Waitlist


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


app = apps.get_app_config("users")
for model_name, model in app.models.items():
    try:
        admin.site.register(model)
    except admin.sites.AlreadyRegistered:
        pass
