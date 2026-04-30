from django.db import models
from django.conf import settings

class Notification(models.Model):
    NOTIFICATION_TYPES = [          # ← must be INSIDE the class
        ('booking_created', 'Booking Created'),
        ('booking_confirmed', 'Booking Confirmed'),
        ('booking_cancelled', 'Booking Cancelled'),
        ('booking_picked_up', 'Booking Picked Up'),
        ('booking_returned', 'Booking Returned'),
        ('payment_received', 'Payment Received'),
        ('inventory_low', 'Inventory Low'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    organization = models.ForeignKey(
        'users.Organization', on_delete=models.CASCADE,
        null=True, blank=True, related_name='notifications'
    )
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES, null=True, blank=True)
    title = models.CharField(max_length=255, default='')
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    booking = models.ForeignKey(
        'inventory.Booking', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='notifications'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='sent_notifications'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title