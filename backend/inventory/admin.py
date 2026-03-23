from django.contrib import admin
from .models import ProductCategory, Product, ProductUnit, Booking, BookingItem, BookingItemUnit

@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization', 'is_active', 'created_at')
    search_fields = ('name', 'organization__name')
    list_filter = ('is_active',)
    readonly_fields = ('slug',)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'category', 'organization',
        'total_quantity', 'total_quantity_good_condition',
        'total_quantity_good_condition_available', 'total_quantity_damaged_condition',
        'total_cost_price', 'is_active'
    )
    search_fields = ('name', 'organization__name', 'category__name')
    list_filter = ('is_active', 'category')
    readonly_fields = (
        'slug', 'total_quantity', 'total_quantity_good_condition',
        'total_quantity_good_condition_available', 'total_quantity_damaged_condition',
        'total_cost_price'
    )

@admin.register(ProductUnit)
class ProductUnitAdmin(admin.ModelAdmin):
    list_display = (
        'serial_number', 'product', 'unit_type', 'status',
        'quantity', 'quantity_available', 'quantity_rented',
        'quantity_good', 'quantity_damaged', 'created_at'
    )
    search_fields = ('serial_number', 'product__name', 'name')
    list_filter = ('status', 'unit_type')
    readonly_fields = (
        'cost_price',
        'quantity_available', 'quantity_rented',
        'quantity_good', 'quantity_damaged',
    )
    fieldsets = (
        ('Identity', {
            'fields': ('product', 'name', 'serial_number', 'unit_type', 'description')
        }),
        ('Pricing', {
            'fields': ('unit_cost_price', 'cost_price', 'rental_price', 'unit')
        }),
        ('Inventory', {
            'fields': (
                'status', 'quantity',
                'quantity_available', 'quantity_rented',
                'quantity_good', 'quantity_damaged',
            )
        }),
    )

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        'booking_id', 'organization', 'client',
        'pickup_date', 'return_date', 'delivery_mode',
        'payment_status', 'status', 'total_amount'
    )
    search_fields = ('client__first_name', 'client__last_name', 'organization__name', 'event_location', 'contact_name')
    list_filter = ('status', 'payment_status', 'delivery_mode')
    readonly_fields = ('total_amount', 'booking_date')

@admin.register(BookingItem)
class BookingItemAdmin(admin.ModelAdmin):
    list_display = ('booking', 'product', 'quantity_booked', 'unit_price', 'total_price', 'total_picked_up', 'total_returned')
    search_fields = ('booking__booking_id', 'product__name')
    readonly_fields = ('total_price',)

@admin.register(BookingItemUnit)
class BookingItemUnitAdmin(admin.ModelAdmin):
    list_display = (
        'booking_item', 'product_unit', 'status',
        'quantity', 'quantity_picked_up',
        'quantity_returned_good', 'quantity_returned_damaged',
        'pickup_date', 'return_date', 'return_condition'
    )
    list_filter = ('status', 'return_condition')
    search_fields = ('booking_item__booking__booking_id', 'product_unit__serial_number')
