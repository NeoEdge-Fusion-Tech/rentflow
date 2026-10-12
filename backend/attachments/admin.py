from django.contrib import admin

from .models import Attachment


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ("original_name", "kind", "organization", "size", "created_at")
    list_filter = ("kind",)
    search_fields = ("original_name",)
