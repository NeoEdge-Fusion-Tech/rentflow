from rest_framework import permissions


class HasModulePermission(permissions.BasePermission):
    """
    Checks if the user has the required granular permission for a specific module.
    The module name must be provided in the view using the `required_module` attribute.

    Admins (creators) bypass this check.
    """

    def has_permission(self, request, view):
        # 1. Superusers bypass all checks
        if request.user.is_superuser:
            return True

        # 2. Check if the user is the owner (creator/admin) of the active organization
        # We assume if request.user.role == "admin" (legacy) or they are the creator, they bypass
        # For a truly robust system, we check if they are the creator of the org, or if they have an 'admin' legacy role
        org = getattr(request.user, "organization", None)
        if not org:
            return False

        if request.user.role == "admin":
            return True

        # 3. If they are not an admin, check their active OrganizationMembership
        required_module = getattr(view, "required_module", None)
        if not required_module:
            # If the view hasn't defined a required module, we allow access by default
            # (or we could deny, but allowing makes backward compatibility easier)
            return True

        # Determine the action type based on HTTP method
        if request.method in permissions.SAFE_METHODS:
            action = "read"
        elif request.method == "DELETE":
            action = "delete"
        else:
            action = "write"

        # Find the user's role in this organization
        try:
            from .models import OrganizationMembership

            membership = OrganizationMembership.objects.get(
                user=request.user, organization=org, is_active=True
            )
            if not membership.role:
                return False

            role_perms = membership.role.permissions or {}
            module_perms = role_perms.get(required_module, [])

            return action in module_perms
        except OrganizationMembership.DoesNotExist:
            # Fallback to legacy behavior if they don't have a membership yet
            return False
