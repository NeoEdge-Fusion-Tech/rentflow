from rest_framework import serializers
from .models import Organization, OrganizationAccountDetails, Subscription, User, Client, Currency

class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = ['id', 'name', 'code', 'symbol', 'status']


class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = ['id', 'subscription_id', 'plan_name', 'status', 'current_period_end']
        read_only_fields = ['status', 'current_period_end']
        
class OrganizationAccountDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationAccountDetails
        fields = ['account_name', 'account_number', 'bank_name', 'bank_code']

from users.mixins import TenantSerializerMixin

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
        fields = ['id', 'name', 'company_logo', 'payout_account_id', 'subscription', 'account_details', 'currency', 'currency_id', 'is_active', 'created_at', 'revenue', 'total_bookings']
        read_only_fields = ['created_at']

    def get_revenue(self, obj):
        return getattr(obj, 'revenue', 0.00)

    def get_total_bookings(self, obj):
        return getattr(obj, 'total_bookings', 0)

class UserSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    organization_id = serializers.IntegerField(source='organization.id', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    currency_symbol = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'organization_id', 'organization_name', 'currency_symbol', 'is_active', 'is_superuser']
        read_only_fields = ['is_active']

    def get_currency_symbol(self, obj):
        if hasattr(obj, 'organization') and obj.organization and obj.organization.currency:
            return obj.organization.currency.symbol
        return '$'

class ClientSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    bookings_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Client
        fields = ['client_id', 'first_name', 'last_name', 'email', 'phone_number', 'company_name', 'address', 'country', 'state', 'status', 'bookings_count']

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
