from rest_framework import permissions

class HasPaidSubscription(permissions.BasePermission):
    """
    Allows access only to users whose organization has a paid subscription (not 'free').
    """
    message = 'Your organization must be on a paid subscription plan to access the Inventory module.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Superusers can always access everything
        if request.user.is_superuser:
            return True
            
        if not request.user.organization:
            return False
            
        # Check if the subscription plan is anything other than 'free'
        return request.user.organization.subscription_plan != 'free'
