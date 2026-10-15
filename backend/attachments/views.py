from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .models import Attachment
from .serializers import AttachmentSerializer, validate_upload
from .targets import allowed_kinds, target_model


class AttachmentViewSet(viewsets.ModelViewSet):
    """
    GET    /api/attachments/?target=expense&object_id=12
    POST   /api/attachments/   (multipart: file, kind, target, object_id)
    DELETE /api/attachments/<id>/
    Scoped to the user's organization; the target record must belong to it.
    """

    serializer_class = AttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    pagination_class = None
    http_method_names = ["get", "post", "delete", "head", "options"]

    def _org(self):
        user = self.request.user
        org = getattr(user, "organization", None)
        if not org and not user.is_superuser:
            raise ValidationError("No organization associated with user.")
        return org

    def _resolve_target(self, name, object_id):
        model = target_model(name)
        if model is None:
            raise ValidationError({"target": f"Unknown target '{name}'."})
        try:
            object_id = int(object_id)
        except (TypeError, ValueError):
            raise ValidationError({"object_id": "A valid object_id is required."})
        qs = model.objects.all()
        org = self._org()
        if org is not None:
            qs = qs.filter(organization=org)
        obj = qs.filter(pk=object_id).first()
        if obj is None:
            raise ValidationError({"object_id": "Record not found."})
        return obj

    def get_queryset(self):
        qs = Attachment.objects.select_related("uploaded_by")
        org = self._org()
        if org is not None:
            qs = qs.filter(organization=org)
        if self.action == "list":
            name = self.request.query_params.get("target")
            object_id = self.request.query_params.get("object_id")
            if not name or not object_id:
                raise ValidationError("target and object_id are required.")
            obj = self._resolve_target(name, object_id)
            qs = qs.filter(
                content_type=ContentType.objects.get_for_model(obj),
                object_id=obj.pk,
            )
            kind = self.request.query_params.get("kind")
            if kind:
                qs = qs.filter(kind=kind)
        return qs

    def create(self, request, *args, **kwargs):
        name = request.data.get("target")
        obj = self._resolve_target(name, request.data.get("object_id"))
        kind = request.data.get("kind") or "other"
        if kind not in allowed_kinds(name):
            raise ValidationError({"kind": f"'{kind}' is not allowed on {name}."})
        f = request.FILES.get("file")
        if not f:
            raise ValidationError({"file": "Choose a file to upload."})
        try:
            mime = validate_upload(f)
        except Exception as e:
            raise ValidationError({"file": getattr(e, "detail", str(e))})

        attachment = Attachment.objects.create(
            organization=obj.organization,
            content_type=ContentType.objects.get_for_model(obj),
            object_id=obj.pk,
            kind=kind,
            file=f,
            original_name=f.name[:255],
            mime_type=mime,
            size=f.size,
            uploaded_by=request.user,
        )
        data = self.get_serializer(attachment).data
        return Response(data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        storage, name = instance.file.storage, instance.file.name
        instance.delete()
        if name:
            transaction.on_commit(lambda: storage.delete(name))
