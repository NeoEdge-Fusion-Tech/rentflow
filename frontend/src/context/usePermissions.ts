export type ActionType = "read" | "write" | "delete";

export function usePermissions(currentUser?: any) {
  const hasPermission = (module: string, action: ActionType) => {
    if (!currentUser) return false;

    // Superusers have full access across the entire platform
    if (currentUser.is_superuser) {
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

    // Lists (["read"]) or, from the role editor, flags ({ read: true }).
    return Array.isArray(modulePerms)
      ? modulePerms.includes(action)
      : !!modulePerms[action];
  };

  return { hasPermission };
}

const allows = (perms: any, action: ActionType) =>
  Array.isArray(perms) ? perms.includes(action) : !!perms?.[action];

/** Admins, validators, and any role granted the Validator module (e.g. Support). */
export function canUseValidator(currentUser?: any): boolean {
  if (!currentUser) return false;
  if (currentUser.is_superuser) return true;
  if (["admin", "validator"].includes(currentUser.role)) return true;
  const perms = currentUser.active_role_permissions || {};
  return (
    (perms._all || []).includes("read") || allows(perms.validator_app, "read")
  );
}

/**
 * Validator-only users see nothing but the Validator: the `validator` user
 * type, or a role whose only permission is the Validator module.
 */
export function isValidatorOnly(currentUser?: any): boolean {
  if (!currentUser || currentUser.is_superuser) return false;
  if (currentUser.role === "validator") return true;
  if (currentUser.role === "admin") return false;
  const perms = currentUser.active_role_permissions || {};
  if ((perms._all || []).length) return false;
  const granted = Object.entries(perms)
    .filter(([module, p]) => module !== "dashboard" && allows(p, "read"))
    .map(([module]) => module);
  return granted.length === 1 && granted[0] === "validator_app";
}
