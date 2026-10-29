import os
import uuid

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.files.storage import storages
from django.db import models


def attachment_storage():
    # Resolved lazily so STORAGE_BACKEND in .env decides where files go.
    return storages["attachments"]


def attachment_upload_to(instance, filename):
    ext = os.path.splitext(filename)[1].lower()
    return f"attachments/{instance.organization_id}/{uuid.uuid4().hex}{ext}"


class Attachment(models.Model):
    """A receipt / invoice file attached to any record (product unit,
    project expense, general expense, ...)."""

    KIND_PURCHASE_RECEIPT = "purchase_receipt"
    KIND_PAYMENT_RECEIPT = "payment_receipt"
    KIND_CLIENT_INVOICE = "client_invoice"
    KIND_OTHER = "other"
    KIND_CHOICES = [
        (KIND_PURCHASE_RECEIPT, "Purchase receipt"),
        (KIND_PAYMENT_RECEIPT, "Payment receipt"),
        (KIND_CLIENT_INVOICE, "Invoice"),
        (KIND_OTHER, "Other"),
    ]

    organization = models.ForeignKey(
        "users.Organization", on_delete=models.CASCADE, related_name="attachments"
    )
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    target = GenericForeignKey("content_type", "object_id")

    kind = models.CharField(max_length=32, choices=KIND_CHOICES, default=KIND_OTHER)
    file = models.FileField(
        upload_to=attachment_upload_to, storage=attachment_storage, max_length=500
    )
    original_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100, blank=True, default="")
    size = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_attachments",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["content_type", "object_id"])]

    def __str__(self):
        return self.original_name
