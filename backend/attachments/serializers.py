from django.conf import settings
from rest_framework import serializers

from .models import Attachment

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "application/pdf",
}


class AttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()
    is_pdf = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = [
            "id",
            "kind",
            "url",
            "original_name",
            "mime_type",
            "size",
            "is_pdf",
            "uploaded_by_name",
            "created_at",
        ]

    def get_url(self, obj):
        try:
            url = obj.file.url
        except Exception:
            return None
        request = self.context.get("request")
        if request and url.startswith("/"):
            return request.build_absolute_uri(url)
        return url

    def get_uploaded_by_name(self, obj):
        u = obj.uploaded_by
        if not u:
            return None
        return f"{u.first_name} {u.last_name}".strip() or u.email

    def get_is_pdf(self, obj):
        return obj.mime_type == "application/pdf" or obj.original_name.lower().endswith(
            ".pdf"
        )


def validate_upload(f):
    max_bytes = settings.ATTACHMENT_MAX_BYTES
    if f.size > max_bytes:
        raise serializers.ValidationError(
            f"File is too large ({f.size / 1024 / 1024:.1f} MB). "
            f"Maximum is {max_bytes / 1024 / 1024:.0f} MB."
        )
    mime = (getattr(f, "content_type", "") or "").lower()
    if mime not in ALLOWED_MIME_TYPES:
        raise serializers.ValidationError(
            "Only images (JPG, PNG, WebP, HEIC) and PDF files are allowed."
        )
    return mime
