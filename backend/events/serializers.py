from rest_framework import serializers
from django.db.models import Sum
from users.mixins import TenantSerializerMixin
from users.serializers import VendorSerializer, ClientSerializer
from feedback.models import FeedbackForm, ProjectFeedback
from .models import Event, ExpenseLineItem, ChecklistTask


class ExpenseLineItemSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    vendor_details = VendorSerializer(source="vendor", read_only=True)

    class Meta:
        model = ExpenseLineItem
        fields = [
            "expense_id",
            "event",
            "expense_type",
            "vendor",
            "vendor_details",
            "name",
            "amount",
            "description",
            "date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
        extra_kwargs = {"name": {"required": False, "allow_blank": True}}

    def validate(self, data):
        expense_type = data.get("expense_type") or (
            self.instance.expense_type if self.instance else None
        )
        vendor = data.get("vendor") or (self.instance.vendor if self.instance else None)
        name = data.get("name") or (self.instance.name if self.instance else None)
        if expense_type == "vendor" and not vendor:
            raise serializers.ValidationError(
                {"vendor": "A vendor is required for vendor-type expenses."}
            )
        if expense_type == "item" and not name:
            raise serializers.ValidationError(
                {"name": "An item name is required for item-type expenses."}
            )
        return data


class EventSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    client_details = serializers.SerializerMethodField()
    revenue = serializers.SerializerMethodField()
    total_expenses = serializers.SerializerMethodField()
    profit = serializers.SerializerMethodField()
    feedback_template_id = serializers.IntegerField(
        write_only=True, required=False, allow_null=True
    )
    invoices_data = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "event_id",
            "organization",
            "name",
            "description",
            "status",
            "start_date",
            "end_date",
            "invoices",
            "invoices_data",
            "client_details",
            "revenue",
            "total_expenses",
            "profit",
            "created_at",
            "updated_at",
            "feedback_template_id",
        ]
        read_only_fields = ["created_at", "updated_at", "organization"]
        extra_kwargs = {
            "invoices": {"required": False},
        }

    def get_client_details(self, obj):
        first_invoice = obj.invoices.first()
        if first_invoice and first_invoice.client:
            return ClientSerializer(first_invoice.client).data
        return None

    def get_invoices_data(self, obj):
        return [
            {
                "invoice_id": inv.invoice_id,
                "invoice_number": inv.invoice_number,
                "total_amount": str(inv.total_amount),
            }
            for inv in obj.invoices.all()
        ]

    def get_revenue(self, obj):
        return sum(inv.total_amount for inv in obj.invoices.all())

    def get_total_expenses(self, obj):
        return obj.expenses.aggregate(total=Sum("amount"))["total"] or 0

    def get_profit(self, obj):
        revenue = self.get_revenue(obj)
        expenses = self.get_total_expenses(obj)
        return revenue - expenses

    def create(self, validated_data):
        feedback_template_id = validated_data.pop("feedback_template_id", None)
        invoices = validated_data.pop("invoices", [])
        event = super().create(validated_data)
        if invoices:
            event.invoices.set(invoices)
        if feedback_template_id:
            try:
                form = FeedbackForm.objects.get(
                    id=feedback_template_id, organization=event.organization
                )
                ProjectFeedback.objects.create(event=event, form=form)
            except FeedbackForm.DoesNotExist:
                pass
        return event

    def update(self, instance, validated_data):
        feedback_template_id = validated_data.pop("feedback_template_id", None)
        invoices = validated_data.pop("invoices", None)
        instance = super().update(instance, validated_data)
        if invoices is not None:
            instance.invoices.set(invoices)
        if feedback_template_id:
            try:
                form = FeedbackForm.objects.get(
                    id=feedback_template_id, organization=instance.organization
                )
                # Ensure it doesn't already exist
                if not ProjectFeedback.objects.filter(
                    event=instance, form=form
                ).exists():
                    ProjectFeedback.objects.create(event=instance, form=form)
            except FeedbackForm.DoesNotExist:
                pass
        return instance


class ChecklistTaskSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    subtasks = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistTask
        fields = [
            "task_id",
            "event",
            "checklist_type",
            "parent_task",
            "name",
            "description",
            "due_date",
            "is_done",
            "position",
            "subtasks",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_subtasks(self, obj):
        return ChecklistTaskSerializer(
            obj.subtasks.all(), many=True, context=self.context
        ).data
