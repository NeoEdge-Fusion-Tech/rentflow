from rest_framework import serializers
from inventory.models import Product, OrganizationBookingSettings, Booking, BookingItem
from inventory.models import MarketplaceTag
from inventory.serializers import ProductUnitSerializer, MarketplaceTagBriefSerializer
from inventory.booking_rules import normalize_days, schedule_errors


class GlobalMarketplaceProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    organization_id = serializers.IntegerField(source="organization.id", read_only=True)
    organization_name = serializers.CharField(
        source="organization.name", read_only=True
    )
    organization_logo = serializers.SerializerMethodField()
    units = ProductUnitSerializer(many=True, read_only=True)
    marketplace_tags = serializers.SerializerMethodField()

    organization_country = serializers.SerializerMethodField()
    organization_city = serializers.SerializerMethodField()
    currency_code = serializers.SerializerMethodField()
    currency_symbol = serializers.SerializerMethodField()
    min_rental_price = serializers.SerializerMethodField()
    quantity_available = serializers.SerializerMethodField()

    vendor_availability = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "product_id",
            "category_name",
            "marketplace_tags",
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
            "organization_country",
            "organization_city",
            "currency_code",
            "currency_symbol",
            "min_rental_price",
            "quantity_available",
            "vendor_availability",
        ]

    def get_organization_city(self, obj):
        return obj.organization.location[0] if obj.organization else ""

    def get_organization_country(self, obj):
        return obj.organization.location[1] if obj.organization else ""

    def get_vendor_availability(self, obj):
        """The vendor's booking days/hours, so customers see them before
        heading to checkout (where they're enforced)."""
        settings = (
            getattr(obj.organization, "booking_settings", None)
            if obj.organization
            else None
        )
        if settings is None:
            return {
                "accepting_requests": True,
                "available_days": [],
                "open_time": None,
                "close_time": None,
                "store": None,
                "timezone": obj.organization.timezone if obj.organization else None,
            }
        try:
            days = normalize_days(settings.available_days)
        except ValueError:
            days = []
        return {
            "accepting_requests": settings.is_accepting_requests,
            "available_days": days,
            "open_time": (
                settings.open_time.strftime("%H:%M") if settings.open_time else None
            ),
            "close_time": (
                settings.close_time.strftime("%H:%M") if settings.close_time else None
            ),
            "store": settings.public_url_slug or None,
            "timezone": obj.organization.timezone,
        }

    def get_currency_code(self, obj):
        cur = obj.organization.currency if obj.organization else None
        return cur.code if cur else None

    def get_currency_symbol(self, obj):
        cur = obj.organization.currency if obj.organization else None
        return cur.symbol if cur else None

    def get_min_rental_price(self, obj):
        prices = [u.rental_price for u in obj.units.all() if u.rental_price]
        return min(prices) if prices else None

    def get_quantity_available(self, obj):
        return sum((u.quantity_available or 0) for u in obj.units.all())

    def get_marketplace_tags(self, obj):
        # Only active tags are shown publicly (uses the prefetched relation).
        return MarketplaceTagBriefSerializer(
            [t for t in obj.marketplace_tags.all() if t.is_active], many=True
        ).data

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
    currency_code = serializers.SerializerMethodField()
    currency_symbol = serializers.SerializerMethodField()
    min_rental_price = serializers.SerializerMethodField()
    quantity_available = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "product_id",
            "category_name",
            "name",
            "slug",
            "description",
            "image",
            "total_quantity_good_condition_available",
            "total_cost_price",
            "units",
            "available_for_rental",
            "organization_name",
            "organization_logo",
            "currency_code",
            "currency_symbol",
            "min_rental_price",
            "quantity_available",
        ]

    def get_currency_code(self, obj):
        cur = obj.organization.currency if obj.organization else None
        return cur.code if cur else None

    def get_currency_symbol(self, obj):
        cur = obj.organization.currency if obj.organization else None
        return cur.symbol if cur else None

    def get_min_rental_price(self, obj):
        prices = [u.rental_price for u in obj.units.all() if u.rental_price]
        return min(prices) if prices else None

    def get_quantity_available(self, obj):
        return sum((u.quantity_available or 0) for u in obj.units.all())

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
    timezone = serializers.CharField(source="organization.timezone", read_only=True)
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
            "timezone",
            "online_payments_enabled",
            "deposit_percent",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        try:
            data["available_days"] = normalize_days(data.get("available_days"))
        except ValueError:
            data["available_days"] = []
        return data

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
    # Pay the deposit online now (else it's a plain request).
    pay_now = serializers.BooleanField(write_only=True, required=False, default=False)
    # Where Paystack should send the guest back to (must be our frontend).
    return_url = serializers.URLField(write_only=True, required=False, allow_blank=True)

    DATETIME_FIELDS = ("setup_date", "set_down_date", "pickup_date", "return_date")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Customers pick wall-clock times ("10:00") in the vendor's local
        # time, so read times without an offset in the vendor's zone.
        settings = self.context.get("booking_settings")
        org = getattr(settings, "organization", None)
        if org is not None:
            for name in self.DATETIME_FIELDS:
                if name in self.fields:
                    self.fields[name].timezone = org.tzinfo

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
            "pay_now",
            "return_url",
        ]

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one product item is required.")
        return value

    def validate(self, attrs):
        setup, set_down = attrs.get("setup_date"), attrs.get("set_down_date")
        if setup and set_down and set_down <= setup:
            raise serializers.ValidationError(
                {"set_down_date": "Set down must be after setup."}
            )

        settings = self.context.get("booking_settings")
        if settings is not None:
            errors = {}
            for field, label in (
                ("setup_date", "Setup"),
                ("set_down_date", "Set down"),
            ):
                problems = schedule_errors(settings, label, attrs.get(field))
                if problems:
                    errors[field] = problems
            if errors:
                raise serializers.ValidationError(errors)
        return attrs


class PublicMarketplaceTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketplaceTag
        fields = ["id", "name", "slug", "description"]
