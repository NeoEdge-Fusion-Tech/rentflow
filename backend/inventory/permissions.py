from rest_framework import permissions

class HasPaidSubscription(permissions.BasePermission):
    """
    Allows access only to users whose organization has a paid subscription (not 'free').
    """
    message = 'Your subscription plan does not include the Inventory module.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Superusers can always access everything
        if request.user.is_superuser:
            return True
            
        if not request.user.organization:
            return False
            
        org = request.user.organization
        plan_name = None
        if hasattr(org, 'subscription') and org.subscription:
            plan_name = org.subscription.plan_name
        elif org.subscription_plan:
            plan_name = org.subscription_plan
            
        if plan_name:
            from users.models import SubscriptionPlan
            plan = SubscriptionPlan.objects.filter(name__iexact=plan_name, is_active=True).first()
            if plan:
                return plan.has_inventory
            free_plan = SubscriptionPlan.objects.filter(is_free=True).first()
            if free_plan:
                return free_plan.has_inventory
        return False
