from django.db import models
from django.utils.text import slugify
from django.db.models import Sum, Q
from django.utils import timezone
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.conf import settings
from users.models import Organization, Client

class ProductCategory(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='categories')
    category_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_categories')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_categories')

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while ProductCategory.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


class Product(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='products')
    product_id = models.AutoField(primary_key=True)
    category = models.ForeignKey(ProductCategory, on_delete=models.PROTECT, related_name='products')
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    description = models.TextField(blank=True, null=True)
    total_quantity = models.PositiveIntegerField(default=0)
    total_quantity_good_condition = models.PositiveIntegerField(default=0)
    total_quantity_good_condition_available = models.PositiveIntegerField(default=0)
    total_quantity_damaged_condition = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    total_cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_products')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_products')

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Product.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        
        if self.pk:
            # Sync counts from related units
            summary = self.units.aggregate(
                total=Sum('quantity'),
                good=Sum('quantity_good'),
                available=Sum('quantity_available'),
                damaged=Sum('quantity_damaged'),
                rented=Sum('quantity_rented'),
                cost=Sum('cost_price')
            )
            self.total_quantity = summary['total'] or 0
            self.total_quantity_good_condition = summary['good'] or 0
            self.total_quantity_good_condition_available = summary['available'] or 0
            self.total_quantity_damaged_condition = summary['damaged'] or 0
            self.total_cost_price = summary['cost'] or 0.00
        
        super().save(*args, **kwargs)

    def get_availability(self, start_date, end_date, exclude_booking_id=None):
        """
        Returns the number of units available for the given date range.
        Availability = total_quantity_good_condition - (sum of quantity_booked in overlapping confirmed/picked_up bookings)
        """
        if not start_date or not end_date:
            return self.total_quantity_good_condition

        from .models import BookingItem
        q = Q(
            product=self,
            booking__status__in=['confirmed', 'picked_up'],
            booking__pickup_date__lte=end_date,
            booking__return_date__gte=start_date
        )
        if exclude_booking_id:
            q &= ~Q(booking_id=exclude_booking_id)
            
        overlapping_items_sum = BookingItem.objects.filter(q).aggregate(total_booked=Sum('quantity_booked'))['total_booked'] or 0
        
        return max(0, self.total_quantity_good_condition - overlapping_items_sum)

    def get_available_units(self, start_date, end_date, exclude_booking_id=None):
        """
        Returns a list of specific ProductUnit instances that have availability for the given range.
        For single units, it's 1 or 0. For bulk units, it returns all bulk units with their available capacity.
        """
        # Exclude units that are already fully assigned to overlapping BookingItemUnits
        from .models import BookingItemUnit
        q = Q(
            product_unit__product=self,
            booking_item__booking__status__in=['confirmed', 'picked_up'],
            booking_item__booking__pickup_date__lte=end_date,
            booking_item__booking__return_date__gte=start_date
        )
        if exclude_booking_id:
            q &= ~Q(booking_item__booking_id=exclude_booking_id)
            
        # For bulk items, we need to know how many are reserved
        reserved_counts = BookingItemUnit.objects.filter(q).values('product_unit_id').annotate(total_reserved=Sum('quantity'))
        reserved_dict = {rc['product_unit_id']: rc['total_reserved'] for rc in reserved_counts}
        
        available_units = []
        for unit in self.units.exclude(status='damaged'):
            reserved = reserved_dict.get(unit.product_unit_id, 0)
            if unit.quantity > reserved:
                # Attach temporary availability info
                unit.temp_available_qty = unit.quantity - reserved
                available_units.append(unit)
                
        return available_units

class ProductUnit(models.Model):
    product_unit_id = models.AutoField(primary_key=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='units')
    # Denormalized organization for fast tenant-scoped queries
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, null=True, blank=True, related_name='product_units')
    name = models.CharField(max_length=255, blank=True, null=True)
    unit_type = models.CharField(max_length=10, choices=[('single', 'Single (SN)'), ('bulk', 'Bulk')], default='single')
    serial_number = models.CharField(max_length=100, unique=True, null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    status_choices = [
        ('available', 'Available'),
        ('rented', 'Rented'),
        ('damaged', 'Damaged'),
        ('maintenance', 'Maintenance'),
    ]
    status = models.CharField(max_length=20, choices=status_choices, default='available')
    unit_cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    quantity = models.PositiveIntegerField(default=1)
    # The total cost price for this specific unit record (unit_cost_price * quantity)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    rental_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    unit_choices = [
        ('pcs', 'Pieces'),
        ('per_hour', 'Per Hour'),
        ('per_day', 'Per Day'),
        ('per_week', 'Per Week'),
        ('per_year', 'Per Year'),
    ]
    unit = models.CharField(max_length=20, blank=True, null=True, choices=unit_choices, default='per_day')

    # --- Quantity breakdown tracking ---
    quantity_available = models.PositiveIntegerField(default=0)
    quantity_rented = models.PositiveIntegerField(default=0)
    quantity_good = models.PositiveIntegerField(default=0)
    quantity_damaged = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_product_units')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_product_units')

    def sync_quantities(self):
        """
        Recompute derived quantity fields.

        quantity_damaged  — USER-SET (preserved for bulk units)
        quantity_good     = quantity - quantity_damaged
        quantity_rented   = derived from active BookingItemUnit records
        quantity_available = quantity_good - quantity_rented
        """
        from django.db.models import Sum
        from .models import BookingItemUnit

        if self.unit_type == 'bulk':
            # quantity_damaged is user-set — clamp it to valid range
            qty_damaged = max(0, min(self.quantity_damaged, self.quantity))
            self.quantity_damaged = qty_damaged

            # good = total not damaged
            qty_good = max(0, self.quantity - qty_damaged)
            self.quantity_good = qty_good

            # rented = currently picked up but not returned
            agg = BookingItemUnit.objects.filter(product_unit=self).aggregate(
                total_picked_up=Sum('quantity_picked_up'),
                total_returned_good=Sum('quantity_returned_good'),
                total_returned_damaged=Sum('quantity_returned_damaged'),
            )
            picked_up = agg['total_picked_up'] or 0
            returned_good = agg['total_returned_good'] or 0
            returned_damaged = agg['total_returned_damaged'] or 0
            currently_rented = max(0, picked_up - returned_good - returned_damaged)
            self.quantity_rented = min(currently_rented, qty_good)  # can't exceed good qty

            # available = good units not currently out
            self.quantity_available = max(0, qty_good - self.quantity_rented)

        else:
            # Single unit — all four fields derived from status
            s = self.status
            self.quantity_available = 1 if s == 'available' else 0
            self.quantity_rented    = 1 if s == 'rented' else 0
            self.quantity_damaged   = 1 if s == 'damaged' else 0
            # good = total condition minus damaged (1 or 0)
            self.quantity_good      = 0 if s == 'damaged' else 1

    def save(self, *args, **kwargs):
        # Auto-populate organization from parent product
        if self.product_id and not self.organization_id:
            self.organization = self.product.organization
        # Auto-calculate cost_price for the unit record
        self.cost_price = self.unit_cost_price * self.quantity
        # Sync quantity breakdown before persisting
        self.sync_quantities()
        super().save(*args, **kwargs)
        # Explicitly update product counts
        if self.product:
            self.product.save()
                
    def delete(self, *args, **kwargs):
        product = self.product
        super().delete(*args, **kwargs)
        if product:
            try:
                product.save()
            except:
                pass

class Booking(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='bookings')
    booking_id = models.AutoField(primary_key=True)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='bookings')
    booking_date = models.DateTimeField(auto_now_add=True)
    pickup_date = models.DateTimeField(null=True, blank=True)
    return_date = models.DateTimeField(null=True, blank=True)
    delivery_mode = models.CharField(max_length=20, choices=[('pickup', 'Pickup'), ('delivery', 'Delivery')], default='pickup')
    event_name = models.CharField(max_length=255, blank=True, null=True)
    event_location = models.TextField(blank=True, null=True)
    contact_name = models.CharField(max_length=255, blank=True, null=True)
    contact_phone = models.CharField(max_length=50, blank=True, null=True)
    status_choices = [
        ('pending', 'Pending Approval'),
        ('confirmed', 'Confirmed'),
        ('picked_up', 'Picked Up'),
        ('returned', 'Returned'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    ]
    status = models.CharField(max_length=20, choices=status_choices, default='pending')
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    comments = models.TextField(blank=True, null=True)
    payment_status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('partial', 'Partial'), ('paid', 'Paid')], default='pending')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_bookings')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_bookings')

    def save(self, *args, **kwargs):
        # Auto-update payment status based on amount_paid
        if self.total_amount <= 0:
            self.payment_status = 'paid'
        else:
            if self.amount_paid >= self.total_amount:
                self.payment_status = 'paid'
            elif self.amount_paid > 0:
                self.payment_status = 'partial'
            else:
                self.payment_status = 'pending'
        super().save(*args, **kwargs)

class BookingItem(models.Model):
    booking_item_id = models.AutoField(primary_key=True)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, null=True, blank=True, related_name='booking_items')
    quantity_booked = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_picked_up = models.PositiveIntegerField(default=0)
    total_returned = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_booking_items')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_booking_items')

class BookingItemUnit(models.Model):
    booking_item_unit_id = models.AutoField(primary_key=True)
    booking_item = models.ForeignKey(BookingItem, on_delete=models.CASCADE, related_name='units')
    product_unit = models.ForeignKey(ProductUnit, on_delete=models.CASCADE)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, null=True, blank=True, related_name='booking_item_units')
    quantity = models.PositiveIntegerField(default=1)
    quantity_picked_up = models.PositiveIntegerField(default=0)
    quantity_returned_good = models.PositiveIntegerField(default=0)
    quantity_returned_damaged = models.PositiveIntegerField(default=0)
    pickup_date = models.DateTimeField(null=True, blank=True)
    return_date = models.DateTimeField(null=True, blank=True)
    return_condition = models.CharField(max_length=20, choices=[('good', 'Good'), ('damaged', 'Damaged')], blank=True, null=True)
    status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('picked_up', 'Picked Up'), ('returned', 'Returned')], default='pending')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_booking_item_units')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_booking_item_units')

    @property
    def total_returned(self):
        return self.quantity_returned_good + self.quantity_returned_damaged

@receiver([post_save, post_delete], sender=BookingItem)
def update_product_availability_on_item_change(sender, instance, **kwargs):
    if instance.product:
        instance.product.save()

@receiver([post_save, post_delete], sender=Booking)
def update_product_availability_on_booking_change(sender, instance, **kwargs):
    # This might be expensive, but necessary for the availability field to be current
    for item in instance.items.all():
        if item.product:
            item.product.save()

@receiver([post_save, post_delete], sender=BookingItemUnit)
def update_product_availability_on_unit_item_change(sender, instance, **kwargs):
    if instance.booking_item and instance.booking_item.product:
        instance.booking_item.product.save()

@receiver([post_save, post_delete], sender=BookingItemUnit)
def update_booking_and_item_status(sender, instance, **kwargs):
    """
    Sync total_picked_up/total_returned on BookingItem + Check for Booking completion.
    """
    if instance.booking_item:
        item = instance.booking_item
        agg = item.units.aggregate(
            total_picked_up=Sum('quantity_picked_up'),
            total_returned_good=Sum('quantity_returned_good'),
            total_returned_damaged=Sum('quantity_returned_damaged'),
        )
        item.total_picked_up = agg['total_picked_up'] or 0
        item.total_returned = (agg['total_returned_good'] or 0) + (agg['total_returned_damaged'] or 0)
        item.save(update_fields=['total_picked_up', 'total_returned'])

        # Check Booking Status
        booking = item.booking
        if booking.status in ['confirmed', 'picked_up', 'returned']:
            items = booking.items.all()
            total_picked_up = sum(i.total_picked_up for i in items)
            total_returned = sum(i.total_returned for i in items)
            
            # Booking is completed if everything picked up was returned
            if total_picked_up > 0 and total_picked_up == total_returned:
                if booking.status != 'completed':
                    booking.status = 'completed'
                    booking.save(update_fields=['status'])
