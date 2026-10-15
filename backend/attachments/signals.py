from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models.signals import post_delete

from .models import Attachment
from .targets import TARGETS, target_model


def _delete_attachments(sender, instance, **kwargs):
    """Remove attachments (and their stored files) when the record they
    belong to is deleted; a generic relation doesn't cascade on its own."""
    ct = ContentType.objects.get_for_model(sender)
    for att in Attachment.objects.filter(content_type=ct, object_id=instance.pk):
        storage, name = att.file.storage, att.file.name
        att.delete()
        # Only remove the stored file once the delete is committed.
        if name:
            transaction.on_commit(lambda s=storage, n=name: s.delete(n))


def connect():
    for name in TARGETS:
        post_delete.connect(
            _delete_attachments,
            sender=target_model(name),
            dispatch_uid=f"attachments-cleanup-{name}",
        )
