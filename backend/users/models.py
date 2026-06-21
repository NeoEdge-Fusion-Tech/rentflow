from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings


class Currency(models.Model):
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=10, unique=True)
    symbol = models.CharField(max_length=10)
    status = models.CharField(max_length=20, choices=[('active', 'Active'), ('inactive', 'Inactive')], default='active')

    def __str__(self):
        return f"{self.code} - {self.name}"


class Organization(models.Model):
    name = models.CharField(max_length=255)
    company_logo = models.ImageField(upload_to='logos/', blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    tax_id = models.CharField(max_length=100, blank=True, null=True, help_text="VAT/Tax Identification Number")
    payout_account_id = models.CharField(max_length=255, blank=True, null=True, help_text="Stripe Connect Account ID or similar")
    currency = models.ForeignKey(Currency, on_delete=models.SET_NULL, null=True, blank=True)
    subscription_plan = models.CharField(max_length=50, choices=[('free', 'Free'), ('basic', 'Basic'), ('pro', 'Pro')], default='free')
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Activity tracking (self-referential — set during create/update)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_organizations'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='updated_organizations'
    )


class OrganizationAccountDetails(models.Model):
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='account_details')
    account_name = models.CharField(max_length=255, blank=True, null=True)
    account_number = models.CharField(max_length=255, blank=True, null=True)
    bank_name = models.CharField(max_length=255, blank=True, null=True)
    bank_code = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_org_account_details'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='updated_org_account_details'
    )


class BankAccount(models.Model):
    """
    A bank account belonging to an organization that can be selected per-invoice
    (e.g. an org may quote different accounts for different currencies/banks).
    Distinct from OrganizationAccountDetails, which is the single payout account
    used for Paystack transfer reconciliation.
    """
    bank_account_id = models.AutoField(primary_key=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='bank_accounts')
    bank_name = models.CharField(max_length=255)
    account_number = models.CharField(max_length=50)
    account_name = models.CharField(max_length=255)
    account_type = models.CharField(
        max_length=20, choices=[('savings', 'Savings'), ('current', 'Current')], default='savings'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_bank_accounts'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='updated_bank_accounts'
    )


class Subscription(models.Model):
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='subscription')
    subscription_id = models.CharField(max_length=255, blank=True, null=True)
    plan_name = models.CharField(max_length=50)
    status = models.CharField(max_length=50, default='active')
    current_period_end = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_subscriptions'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='updated_subscriptions'
    )


class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('operator_web', 'Operator (Web)'),
        ('operator_mobile', 'Operator (Mobile)'),
        ('customer', 'Customer'),
    )
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='operator_web')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='users', null=True, blank=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    email_verified = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    # Track who last modified this user
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='modified_users'
    )


class Client(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='clients')
    client_id = models.AutoField(primary_key=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    company_name = models.CharField(max_length=255, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, choices=[('active', 'Active'), ('inactive', 'Inactive')], default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_clients'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='updated_clients'
    )


class OTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps')
    code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=50, choices=[
        ('email_verification', 'Email Verification'),
        ('password_reset', 'Password Reset')
    ])
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"{self.user.email} - {self.purpose} - {self.code}"
