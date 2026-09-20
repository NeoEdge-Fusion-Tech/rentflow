export type ActionType = "read" | "write" | "delete";

export function usePermissions(currentUser?: any) {
  const hasPermission = (module: string, action: ActionType) => {
    if (!currentUser) return false;

    // Superusers and legacy admins have full access
    if (currentUser.is_superuser || currentUser.role === "admin") {
      return true;
    }

    const permissions = currentUser.active_role_permissions;
    if (!permissions) return false;

    // Catch-all override for super admins returned from backend
    if (permissions._all?.includes(action)) {
      return true;
    }

    // Check specific module
    const modulePerms = permissions[module];
    if (!modulePerms) return false;

    return modulePerms.includes(action);
  };

  return { hasPermission };
}
