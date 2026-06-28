from django.contrib import admin
from .models import Organization, OrganizationAccountDetails, Subscription, SubscriptionPlan, User, Client, Currency

@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'first_name', 'last_name', 'role', 'organization', 'is_active')
    search_fields = ('email', 'first_name', 'last_name', 'organization__name')
    list_filter = ('role', 'is_active')

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'email', 'company_name', 'organization', 'status')
    search_fields = ('first_name', 'last_name', 'email', 'company_name', 'organization__name')
    list_filter = ('status',)

admin.site.register(OrganizationAccountDetails)

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('organization', 'plan_name', 'status', 'max_invoices_per_month', 'current_period_end')
    list_filter = ('status', 'plan_name')
    search_fields = ('organization__name', 'subscription_id')
    list_editable = ('max_invoices_per_month',)

@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'billing_cycle', 'max_invoices_per_month', 'max_inventory_booking_per_month', 'has_booking', 'has_invoice', 'is_free', 'is_active')
    list_filter = ('billing_cycle', 'is_free', 'is_active', 'has_booking', 'has_invoice')
    search_fields = ('name',)

@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'symbol', 'status')
    list_filter = ('status',)
    search_fields = ('name', 'code')
