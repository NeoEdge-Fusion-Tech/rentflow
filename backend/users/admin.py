from django.contrib import admin
from .models import Organization, OrganizationAccountDetails, Subscription, User, Client, Currency

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
admin.site.register(Subscription)

@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'symbol', 'status')
    list_filter = ('status',)
    search_fields = ('name', 'code')
