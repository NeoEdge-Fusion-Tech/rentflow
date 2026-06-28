from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Organization, OrganizationAccountDetails, BankAccount, Subscription, SubscriptionPlan, User, Client, Currency

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.email_verified:
            raise serializers.ValidationError({"email": "Please verify your email address before logging in."})
        return data

class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = ['id', 'name', 'code', 'symbol', 'status']
class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = ['id', 'name', 'description', 'price', 'billing_cycle', 'max_invoices_per_month', 'max_inventory_booking_per_month', 'has_booking', 'has_invoice', 'is_free', 'is_active', 'created_at']


class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = ['id', 'subscription_id', 'plan_name', 'status', 'current_period_end', 'max_invoices_per_month']
        read_only_fields = ['status', 'current_period_end']
        
class OrganizationAccountDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationAccountDetails
        fields = ['account_name', 'account_number', 'bank_name', 'bank_code']

from users.mixins import TenantSerializerMixin

class BankAccountSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = ['bank_account_id', 'bank_name', 'account_number', 'account_name', 'account_type', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class OrganizationSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    subscription = SubscriptionSerializer(read_only=True)
    account_details = OrganizationAccountDetailsSerializer(read_only=True)
    currency = CurrencySerializer(read_only=True)
    currency_id = serializers.PrimaryKeyRelatedField(
        queryset=Currency.objects.all(), source='currency', write_only=True, required=False
    )
    revenue = serializers.SerializerMethodField()
    total_bookings = serializers.SerializerMethodField()
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'company_logo', 'address', 'phone_number', 'email', 'tax_id', 'payout_account_id', 'subscription', 'account_details', 'currency', 'currency_id', 'primary_color', 'is_active', 'created_at', 'revenue', 'total_bookings']
        read_only_fields = ['created_at']

    def get_revenue(self, obj):
        return getattr(obj, 'revenue', 0.00)

    def get_total_bookings(self, obj):
        return getattr(obj, 'total_bookings', 0)

class UserSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    organization_id = serializers.IntegerField(source='organization.id', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    subscription_plan = serializers.CharField(source='organization.subscription_plan', read_only=True)
    currency_symbol = serializers.SerializerMethodField()
    has_booking = serializers.SerializerMethodField()
    has_invoice = serializers.SerializerMethodField()
    subscription_usage = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'organization_id', 'organization_name', 'subscription_plan', 'currency_symbol', 'has_booking', 'has_invoice', 'subscription_usage', 'is_active', 'is_superuser']
        read_only_fields = ['is_active']

    def get_currency_symbol(self, obj):
        if hasattr(obj, 'organization') and obj.organization and obj.organization.currency:
            return obj.organization.currency.symbol
        return '$'

    def get_has_booking(self, obj):
        if hasattr(obj, 'organization') and obj.organization:
            org = obj.organization
            plan_name = None
            if hasattr(org, 'subscription') and org.subscription:
                plan_name = org.subscription.plan_name
            elif org.subscription_plan:
                plan_name = org.subscription_plan
            
            if plan_name:
                plan = SubscriptionPlan.objects.filter(name__iexact=plan_name, is_active=True).first()
                if plan:
                    return plan.has_booking
                
                # Fallback to free plan if we don't find it
                free_plan = SubscriptionPlan.objects.filter(is_free=True).first()
                if free_plan:
                    return free_plan.has_booking
        return False

    def get_has_invoice(self, obj):
        if hasattr(obj, 'organization') and obj.organization:
            org = obj.organization
            plan_name = None
            if hasattr(org, 'subscription') and org.subscription:
                plan_name = org.subscription.plan_name
            elif org.subscription_plan:
                plan_name = org.subscription_plan
            
            if plan_name:
                plan = SubscriptionPlan.objects.filter(name__iexact=plan_name, is_active=True).first()
                if plan:
                    return plan.has_invoice
                # Fallback to free plan if we don't find it
                free_plan = SubscriptionPlan.objects.filter(is_free=True).first()
                if free_plan:
                    return free_plan.has_invoice
        return False

    def get_subscription_usage(self, obj):
        usage = {
            "invoices_used": 0,
            "invoices_limit": 10,
            "bookings_used": 0,
            "bookings_limit": 10
        }
        if hasattr(obj, 'organization') and obj.organization:
            org = obj.organization
            plan_name = None
            if hasattr(org, 'subscription') and org.subscription:
                plan_name = org.subscription.plan_name
            elif org.subscription_plan:
                plan_name = org.subscription_plan
            
            if plan_name:
                plan = SubscriptionPlan.objects.filter(name__iexact=plan_name, is_active=True).first()
                if not plan:
                    plan = SubscriptionPlan.objects.filter(is_free=True).first()
                
                if plan:
                    usage["invoices_limit"] = plan.max_invoices_per_month
                    usage["bookings_limit"] = plan.max_inventory_booking_per_month
            
            from django.utils import timezone
            now = timezone.now()
            
            from payment.models import Invoice
            usage["invoices_used"] = Invoice.objects.filter(
                organization=org,
                booking__isnull=True,
                created_at__year=now.year,
                created_at__month=now.month
            ).count()
            
            from inventory.models import Booking
            usage["bookings_used"] = Booking.objects.filter(
                organization=org,
                created_at__year=now.year,
                created_at__month=now.month
            ).count()
            
        return usage

class ClientSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    bookings_count = serializers.IntegerField(read_only=True)
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return None

    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return f"{obj.updated_by.first_name} {obj.updated_by.last_name}".strip() or obj.updated_by.email
        return None

    class Meta:
        model = Client
        fields = ['client_id', 'first_name', 'last_name', 'email', 'phone_number', 'company_name', 'address', 'country', 'state', 'status', 'bookings_count', 'created_by_name', 'updated_by_name', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

from django.db import transaction

class RegisterSerializer(serializers.Serializer):
    company_name = serializers.CharField(max_length=255)
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    currency_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        with transaction.atomic():
            currency_id = validated_data.get('currency_id')
            currency_obj = None
            if currency_id:
                try: 
                    currency_obj = Currency.objects.get(id=currency_id)
                except Currency.DoesNotExist:
                    pass
            organization = Organization.objects.create(name=validated_data['company_name'], currency=currency_obj)
            
            names = validated_data['full_name'].split(' ', 1)
            first_name = names[0]
            last_name = names[1] if len(names) > 1 else ''

            user = User.objects.create_user(
                username=validated_data['email'],
                email=validated_data['email'],
                password=validated_data['password'],
                first_name=first_name,
                last_name=last_name,
                role='admin',
                organization=organization
            )
            return user

class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)

class SetNewPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True)

class AdminChangePasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(write_only=True)
