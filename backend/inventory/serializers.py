from rest_framework import serializers
from .models import ProductCategory, Product, ProductUnit, Booking, BookingItem, BookingItemUnit

from users.mixins import TenantSerializerMixin

class ProductCategorySerializer(TenantSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = ['category_id', 'name', 'slug', 'description', 'is_active']
        read_only_fields = ['slug']

class ProductUnitSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    product_unit_id = serializers.IntegerField(required=False)
    # Override to remove automatic unique validator for nested updates
    serial_number = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = ProductUnit
        fields = ['product_unit_id', 'product', 'name', 'unit_type', 'serial_number', 'status', 'description', 
                  'unit_cost_price', 'quantity', 'cost_price', 'rental_price', 'unit',
                  'quantity_available', 'quantity_rented', 'quantity_good', 'quantity_damaged']
        read_only_fields = ['product', 'cost_price', 'quantity_available', 'quantity_rented', 'quantity_good']
        # quantity_damaged is writable — user can mark how many are damaged

    def validate_quantity_damaged(self, value):
        """Ensure quantity_damaged does not exceed the unit's total quantity."""
        # quantity may be in the incoming data or on the instance
        instance = getattr(self, 'instance', None)
        quantity = self.initial_data.get('quantity') if hasattr(self, 'initial_data') else None
        if quantity is None and instance:
            quantity = instance.quantity
        if quantity is not None:
            try:
                if value > int(quantity):
                    raise serializers.ValidationError(
                        f"Damaged quantity ({value}) cannot exceed total quantity ({quantity})."
                    )
            except (TypeError, ValueError):
                pass
        return value

    def validate(self, data):
        serial = data.get('serial_number')
        if serial:
            # Check uniqueness manually, accounting for updates
            # We look for product_unit_id in data (since we made it writable above)
            unit_id = data.get('product_unit_id')
            qs = ProductUnit.objects.filter(serial_number=serial)
            if unit_id:
                qs = qs.exclude(product_unit_id=unit_id)
            
            if qs.exists():
                raise serializers.ValidationError({"serial_number": "product unit with this serial number already exists."})
        return data

class ProductSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    units = ProductUnitSerializer(many=True, required=False)
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
        model = Product
        fields = ['product_id', 'category', 'category_name', 'name', 'slug', 'description', 
                  'total_quantity', 'total_quantity_good_condition', 'total_quantity_good_condition_available', 
                  'total_quantity_damaged_condition', 'is_active', 'total_cost_price', 'units',
                  'created_by_name', 'updated_by_name', 'created_at', 'updated_at']
        read_only_fields = ['total_quantity_good_condition', 'total_quantity_good_condition_available', 'total_quantity_damaged_condition', 'total_quantity', 'total_cost_price', 'slug', 'created_at', 'updated_at']

    def validate(self, data):
        if not self.instance and not data.get('units'):
            raise serializers.ValidationError({"units": "At least one product unit is required when creating a product."})
        return data

    def create(self, validated_data):
        units_data = validated_data.pop('units', [])
        product = Product.objects.create(**validated_data)
        for unit_data in units_data:
            # Pop product_unit_id if present (could be None or dummy)
            unit_data.pop('product_unit_id', None)
            ProductUnit.objects.create(product=product, **unit_data)
        
        product.save() # Trigger quantity sync from units
        return product

    def update(self, instance, validated_data):
        units_data = validated_data.pop('units', None)
        
        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if units_data is not None:
            existing_units = {u.product_unit_id: u for u in instance.units.all()}
            
            for unit_data in units_data:
                unit_id = unit_data.pop('product_unit_id', None)
                if unit_id and unit_id in existing_units:
                    unit = existing_units.pop(unit_id)
                    for attr, value in unit_data.items():
                        setattr(unit, attr, value)
                    unit.save()
                else:
                    ProductUnit.objects.create(product=instance, **unit_data)
            
            # Remaining units were removed
            for unit in existing_units.values():
                unit.delete()
        
        instance.save() # Final sync
        return instance

class BookingItemUnitSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    serial_number = serializers.ReadOnlyField(source='product_unit.serial_number')
    unit_type = serializers.ReadOnlyField(source='product_unit.unit_type')
    quantity_returned = serializers.ReadOnlyField(source='total_returned')
    pickup_date = serializers.DateTimeField(allow_null=True, required=False)
    return_date = serializers.DateTimeField(allow_null=True, required=False)

    class Meta:
        model = BookingItemUnit
        fields = [
            'booking_item_unit_id', 'product_unit', 'unit_type', 'serial_number', 
            'quantity', 'quantity_picked_up', 'quantity_returned_good', 
            'quantity_returned_damaged', 'quantity_returned', 'pickup_date', 'return_date'
        ]

class BookingItemSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    units = BookingItemUnitSerializer(many=True, required=False)

    product_name = serializers.ReadOnlyField(source='product.name')
    class Meta:
        model = BookingItem
        fields = ['booking_item_id', 'product', 'product_name', 'quantity_booked', 'unit_price', 'total_price', 'units', 'total_picked_up', 'total_returned']
        read_only_fields = ['total_price']

    def validate(self, data):
        # Default unit_price from product if not provided
        if not data.get('unit_price') and data.get('product'):
            first_unit = data['product'].units.first()
            data['unit_price'] = first_unit.rental_price if first_unit else 0
        
        # Calculate total_price
        if data.get('unit_price') and data.get('quantity_booked'):
            data['total_price'] = data['unit_price'] * data['quantity_booked']
            
        return data

class ProductAvailabilitySerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    start_date = serializers.DateTimeField()
    end_date = serializers.DateTimeField()
    available_quantity = serializers.IntegerField()
    total_good_condition = serializers.IntegerField()
    available_units = serializers.JSONField()

class BookingSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    items = BookingItemSerializer(many=True, required=False)
    client_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()
    pickup_date = serializers.DateTimeField(allow_null=True, required=False)
    return_date = serializers.DateTimeField(allow_null=True, required=False)

    def get_client_name(self, obj):
        if obj.client:
            return f"{obj.client.first_name} {obj.client.last_name}"
        return "Unknown Client"

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return None

    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return f"{obj.updated_by.first_name} {obj.updated_by.last_name}".strip() or obj.updated_by.email
        return None

    class Meta:
        model = Booking
        fields = ['booking_id', 'client', 'client_name', 'booking_date', 'pickup_date', 'return_date', 'delivery_mode', 
                  'event_name', 'event_location', 'contact_name', 'contact_phone', 'status', 'payment_status', 
                  'total_amount', 'amount_paid', 'discount_amount', 'discount_percentage', 'items',
                  'created_by_name', 'updated_by_name', 'created_at', 'updated_at']
        read_only_fields = ['total_amount', 'payment_status', 'created_at', 'updated_at']

    def validate(self, data):
        # Validate existence of items
        if not self.instance and not data.get('items'):
            raise serializers.ValidationError({"items": "At least one booking item is required when creating a booking."})
        
        # Validate availability for each item
        pickup = data.get('pickup_date')
        return_date = data.get('return_date')
        
        if pickup and return_date:
            if pickup > return_date:
                raise serializers.ValidationError("Return date must be after pickup date.")
            
            for item in data.get('items', []):
                product = item.get('product')
                qty = item.get('quantity_booked')
                if product and qty:
                    avail = product.get_availability(pickup, return_date)
                    if qty > avail:
                        raise serializers.ValidationError(
                            f"Only {avail} units of '{product.name}' are available for the selected dates."
                        )
        return data

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        
        # Calculate total_amount from items
        total = 0
        for item in items_data:
            product = item.get('product')
            qty = item.get('quantity_booked', 0)
            first_unit = product.units.first() if product else None
            price = item.get('unit_price') or (first_unit.rental_price if first_unit else 0)
            total += price * qty
            
        # Apply discount logic
        discount_amt = validated_data.get('discount_amount', 0)
        discount_pct = validated_data.get('discount_percentage', 0)
        
        if discount_pct > 0:
            total = total * (1 - (discount_pct / 100))
        total -= discount_amt
        
        validated_data['total_amount'] = max(0, total)
        
        booking = Booking.objects.create(**validated_data)
        for item_data in items_data:
            units_data = item_data.pop('units', [])
            # Ensure price is set
            if not item_data.get('unit_price'):
                first_unit = item_data['product'].units.first()
                item_data['unit_price'] = first_unit.rental_price if first_unit else 0
            item_data['total_price'] = item_data['unit_price'] * item_data['quantity_booked']
            
            booking_item = BookingItem.objects.create(booking=booking, **item_data)
            
            # Create BookingItemUnits if provided
            for unit_entry in units_data:
                BookingItemUnit.objects.create(
                    booking_item=booking_item,
                    product_unit=unit_entry['product_unit'],
                    quantity=unit_entry.get('quantity', 1),
                    pickup_date=booking.pickup_date,
                    return_date=booking.return_date
                )
        return booking

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        
        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if items_data is not None:
            # For simplicity in this demo/MVP, we'll sync items
            # In a real app, you might want more granular updates
            existing_items = {item.booking_item_id: item for item in instance.items.all()}
            
            new_total = 0
            for item_data in items_data:
                item_id = item_data.get('booking_item_id')
                units_data = item_data.pop('units', [])
                
                # Default price
                if not item_data.get('unit_price'):
                    first_unit = item_data['product'].units.first()
                    item_data['unit_price'] = first_unit.rental_price if first_unit else 0
                item_data['total_price'] = item_data['unit_price'] * item_data['quantity_booked']
                
                if item_id and item_id in existing_items:
                    item = existing_items.pop(item_id)
                    for attr, value in item_data.items():
                        setattr(item, attr, value)
                    item.save()
                    booking_item = item
                else:
                    booking_item = BookingItem.objects.create(booking=instance, **item_data)
                
                new_total += booking_item.total_price

                # Sync Units
                if units_data is not None:
                    existing_units = {u.booking_item_unit_id: u for u in booking_item.units.all()}
                    
                    for unit_entry in units_data:
                        unit_id = unit_entry.get('booking_item_unit_id')
                        # Basic fields for create/update
                        unit_fields = {
                            'product_unit': unit_entry['product_unit'],
                            'quantity': unit_entry.get('quantity', 1),
                            'quantity_picked_up': unit_entry.get('quantity_picked_up', 0),
                            'quantity_returned_good': unit_entry.get('quantity_returned_good', 0),
                            'quantity_returned_damaged': unit_entry.get('quantity_returned_damaged', 0),
                            'pickup_date': instance.pickup_date,
                            'return_date': instance.return_date
                        }
                        
                        if unit_id and unit_id in existing_units:
                            unit = existing_units.pop(unit_id)
                            for attr, value in unit_fields.items():
                                setattr(unit, attr, value)
                            unit.save()
                        else:
                            BookingItemUnit.objects.create(
                                booking_item=booking_item,
                                **unit_fields
                            )
                    
                    # Delete removed units
                    for unit in existing_units.values():
                        unit.delete()
            
            # Delete removed items
            for item in existing_items.values():
                item.delete()

            # Recalculate total_amount with discounts
            discount_amt = instance.discount_amount
            discount_pct = instance.discount_percentage
            
            if discount_pct > 0:
                new_total = new_total * (1 - (discount_pct / 100))
            new_total -= discount_amt
            instance.total_amount = max(0, new_total)

        instance.save()
        return instance
