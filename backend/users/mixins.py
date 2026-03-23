from users.models import Organization
from rest_framework import serializers

class TenantIsolationMixin:
    """Enforces that users only see and interact with data from their own organization."""
    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return self.queryset.none()
        
        qs = getattr(self, 'queryset', None)
        if qs is None:
            # Fallback for viewsets that don't define queryset attribute
            model = getattr(self, 'model', None)
            if model:
                qs = model.objects.all()
            else:
                # Last resort: try to get model from serializer if available
                serializer_class = getattr(self, 'serializer_class', None)
                if serializer_class and hasattr(serializer_class, 'Meta'):
                    qs = serializer_class.Meta.model.objects.all()
        
        if qs is None:
            return None # Should handled by the viewset
        
        # Superuser can see everything and optionally filter by organization
        if user.is_superuser:
            org_id = self.request.query_params.get('organization')
            if org_id:
                if qs.model == Organization:
                    return qs.filter(id=org_id)
                if hasattr(qs.model, 'organization'):
                    return qs.filter(organization_id=org_id)
                
                model_name = qs.model.__name__
                if model_name in ['BookingItem', 'Payment']:
                    return qs.filter(booking__organization_id=org_id)
                if model_name == 'BookingItemUnit':
                    return qs.filter(booking_item__booking__organization_id=org_id)
                if model_name == 'ProductUnit':
                    return qs.filter(product__organization_id=org_id)
            return qs.all()
            
        if not hasattr(user, 'organization') or not user.organization:
            return self.queryset.none()
        
        if qs.model == Organization:
            return qs.filter(id=user.organization.id)
            
        if hasattr(qs.model, 'organization'):
            return qs.filter(organization=user.organization)
            
        model_name = qs.model.__name__
        if model_name == 'BookingItem':
            return qs.filter(booking__organization=user.organization)
        if model_name == 'BookingItemUnit':
            return qs.filter(booking_item__booking__organization=user.organization)
        if model_name == 'Payment':
            return qs.filter(booking__organization=user.organization)
        if model_name == 'ProductUnit':
            return qs.filter(product__organization=user.organization)
            
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        # Regular users are forced to their own organization
        if not user.is_superuser:
            if hasattr(serializer.Meta.model, 'organization'):
                serializer.save(organization=user.organization)
            else:
                serializer.save()
        else:
            # Superusers can specify an organization or default to none (system-wide)
            serializer.save()

class TenantSerializerMixin:
    """
    Automatically filters all PrimaryKeyRelatedField querysets to the user's organization.
    Should be mixed into ModelSerializers.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if 'context' not in kwargs or 'request' not in kwargs['context']:
            return

        request = kwargs['context']['request']
        user = request.user
        
        if not user.is_authenticated or user.is_superuser:
            return

        organization = getattr(user, 'organization', None)
        if not organization:
            return

        # Iterate over all fields and filter RelatedFields
        for field_name, field in self.fields.items():
            if isinstance(field, serializers.PrimaryKeyRelatedField):
                if hasattr(field.queryset.model, 'organization'):
                    field.queryset = field.queryset.filter(organization=organization)
                elif field.queryset.model == Organization:
                    field.queryset = field.queryset.filter(id=organization.id)
            elif isinstance(field, serializers.ManyRelatedField) and isinstance(field.child_relation, serializers.PrimaryKeyRelatedField):
                if hasattr(field.child_relation.queryset.model, 'organization'):
                    field.child_relation.queryset = field.child_relation.queryset.filter(organization=organization)
                elif field.child_relation.queryset.model == Organization:
                    field.child_relation.queryset = field.child_relation.queryset.filter(id=organization.id)
