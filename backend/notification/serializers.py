from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    booking_id = serializers.IntegerField(source='booking.booking_id', read_only=True, allow_null=True)

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return None

    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'notification_type',
            'is_read', 'read_at', 'booking_id',
            'created_by_name', 'created_at'
        ]
        read_only_fields = [
            'id', 'title', 'message', 'notification_type',
            'read_at', 'booking_id', 'created_by_name', 'created_at'
        ]
        # Only 'is_read' is writable — so frontend can mark as read