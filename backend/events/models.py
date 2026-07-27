from django.db import models
from django.conf import settings


class Event(models.Model):
    """
    A project/event that Profit & Loss and Task Checklist attach to.
    Deliberately independent of Booking (the rental-specific model) so
    orgs can track non-rental projects too.
    """
    organization = models.ForeignKey('users.Organization', on_delete=models.CASCADE, related_name='events')
    event_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status_choices = [
        ('planned', 'Planned'),
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    status = models.CharField(max_length=20, choices=status_choices, default='planned')
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    invoice = models.ForeignKey(
        'payment.Invoice', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='pl_events'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_events'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='updated_events'
    )

    def __str__(self):
        return self.name


class ExpenseLineItem(models.Model):
    expense_id = models.AutoField(primary_key=True)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='expenses')
    # Denormalized for tenant-isolation filtering without a join (matches Payment.organization).
    organization = models.ForeignKey(
        'users.Organization', on_delete=models.CASCADE,
        null=True, blank=True, related_name='expense_items'
    )
    expense_type_choices = [
        ('vendor', 'Vendor'),
        ('item', 'Item'),
    ]
    expense_type = models.CharField(max_length=10, choices=expense_type_choices)
    vendor = models.ForeignKey(
        'users.Vendor', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='expenses'
    )
    name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    description = models.TextField(blank=True, null=True)
    date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_expense_items'
    )

    def save(self, *args, **kwargs):
        if self.event_id and not self.organization_id:
            self.organization = self.event.organization
        if self.expense_type == 'vendor' and self.vendor_id:
            self.name = self.vendor.service
        super().save(*args, **kwargs)


class ChecklistTask(models.Model):
    task_id = models.AutoField(primary_key=True)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='tasks')
    # Denormalized for tenant-isolation filtering without a join (matches Payment.organization).
    organization = models.ForeignKey(
        'users.Organization', on_delete=models.CASCADE,
        null=True, blank=True, related_name='checklist_tasks'
    )
    checklist_type_choices = [
        ('pre_event', 'Pre-Event'),
        ('during_event', 'During Event'),
        ('post_event', 'Post-Event'),
    ]
    checklist_type = models.CharField(max_length=20, choices=checklist_type_choices)
    parent_task = models.ForeignKey(
        'self', on_delete=models.CASCADE,
        null=True, blank=True, related_name='subtasks'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    due_date = models.DateTimeField(blank=True, null=True)
    is_done = models.BooleanField(default=False)
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_checklist_tasks'
    )

    class Meta:
        ordering = ['checklist_type', 'position', 'task_id']

    def save(self, *args, **kwargs):
        if self.event_id and not self.organization_id:
            self.organization = self.event.organization
        super().save(*args, **kwargs)
