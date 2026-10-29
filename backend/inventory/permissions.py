from rest_framework import permissions


class HasPaidSubscription(permissions.BasePermission):
    """
    Allows access only to users whose organization has a paid subscription (not 'free').
    """

    message = "Your subscription plan does not include the Inventory module."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Superusers can always access everything
        if request.user.is_superuser:
            return True

        if not request.user.organization:
            return False

        from users.subscriptions import effective_plan

        # Expired/lapsed subscriptions fall back to the free plan's rules.
        plan = effective_plan(request.user.organization)
        return bool(plan and plan.has_inventory)
