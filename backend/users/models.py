from django.db import models
from django.contrib.auth.models import AbstractUser

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
    payout_account_id = models.CharField(max_length=255, blank=True, null=True, help_text="Stripe Connect Account ID or similar")
    currency = models.ForeignKey(Currency, on_delete=models.SET_NULL, null=True, blank=True)
    subscription_plan = models.CharField(max_length=50, choices=[('free', 'Free'), ('basic', 'Basic'), ('pro', 'Pro')], default='free')
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class OrganizationAccountDetails(models.Model):
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='account_details')
    account_name = models.CharField(max_length=255, blank=True, null=True)
    account_number = models.CharField(max_length=255, blank=True, null=True)
    bank_name = models.CharField(max_length=255, blank=True, null=True)
    bank_code = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
class Subscription(models.Model):
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='subscription')
    subscription_id = models.CharField(max_length=255, blank=True, null=True)
    plan_name = models.CharField(max_length=50)
    status = models.CharField(max_length=50, default='active')
    current_period_end = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
