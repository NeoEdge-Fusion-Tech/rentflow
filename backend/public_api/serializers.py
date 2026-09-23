from rest_framework import serializers
from inventory.models import Product, OrganizationBookingSettings, Booking, BookingItem
from inventory.serializers import ProductUnitSerializer


class GlobalMarketplaceProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    organization_id = serializers.IntegerField(source="organization.id", read_only=True)
    organization_name = serializers.CharField(
        source="organization.name", read_only=True
    )
    organization_logo = serializers.SerializerMethodField()
    units = ProductUnitSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "product_id",
            "category_name",
            "name",
            "slug",
            "description",
            "total_quantity_good_condition_available",
            "total_cost_price",
            "units",
            "available_for_rental",
            "organization_id",
            "organization_name",
            "organization_logo",
        ]

    def get_organization_logo(self, obj):
        if obj.organization and obj.organization.company_logo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.organization.company_logo.url)
            return obj.organization.company_logo.url
        return None


class PublicProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    organization_name = serializers.CharField(
        source="organization.name", read_only=True
    )
    organization_logo = serializers.SerializerMethodField()
    units = ProductUnitSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "product_id",
            "category_name",
            "name",
            "slug",
            "description",
            "total_quantity_good_condition_available",
            "total_cost_price",
            "units",
            "available_for_rental",
            "organization_name",
            "organization_logo",
        ]

    def get_organization_logo(self, obj):
        if obj.organization and obj.organization.company_logo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.organization.company_logo.url)
            return obj.organization.company_logo.url
        return None


class PublicBookingSettingsSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(
        source="organization.name", read_only=True
    )
    organization_logo = serializers.SerializerMethodField()

    class Meta:
        model = OrganizationBookingSettings
        fields = [
            "available_days",
            "open_time",
            "close_time",
            "is_accepting_requests",
            "storefront_name",
            "organization_name",
            "organization_logo",
        ]

    def get_organization_logo(self, obj):
        if obj.organization and obj.organization.company_logo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.organization.company_logo.url)
            return obj.organization.company_logo.url
        return None


class PublicBookingItemRequestSerializer(serializers.Serializer):
    product_unit_id = serializers.IntegerField()
    quantity_booked = serializers.IntegerField(min_value=1)


class PublicBookingRequestSerializer(serializers.ModelSerializer):
    items = PublicBookingItemRequestSerializer(many=True, write_only=True)
    email = serializers.EmailField(write_only=True)

    class Meta:
        model = Booking
        fields = [
            "contact_name",
            "contact_phone",
            "email",
            "setup_date",
            "set_down_date",
            "event_type",
            "country",
            "city",
            "address",
            "note_for_org",
            "pickup_date",
            "return_date",
            "items",
        ]

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one product item is required.")
        return value
