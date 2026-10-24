/**
 * Access control configuration for the Marketplace and Public Storefront.
 *
 * When `enabled` is true, a "Coming Soon" mask is displayed over the
 * marketplace and storefront for all users, EXCEPT those whose profiles
 * match the allowlist below.
 */

/**
 * List of email profiles who can see the marketplace to test.
 * You can add emails directly here or in Django's backend `config/settings.py` (ALLOW_STORE).
 */
export const ALLOW_STORE: string[] = [
  // Add allowed email addresses here:
];

export interface MarketplaceAccessConfig {
  /** Master switch: if true, Coming Soon mask is active. If false, open to everyone. */
  enabled: boolean;

  /** When true, Django superusers / admins automatically bypass the Coming Soon mask. */
  allowSuperusers: boolean;

  /** List of user emails allowed to access (case-insensitive). */
  allowedEmails: string[];

  /** List of usernames allowed to access (case-insensitive). */
  allowedUsernames: string[];

  /** List of numeric user IDs allowed to access. */
  allowedUserIds: number[];

  /** List of organization IDs whose members can view the marketplace and storefront. */
  allowedOrganizationIds: (string | number)[];

  /** Optional preview passphrase to quickly unlock access without signing in. */
  previewPassphrase?: string;
}

export const MARKETPLACE_ACCESS_CONFIG: MarketplaceAccessConfig = {
  enabled: true,
  allowSuperusers: true,

  // Allowed email addresses (also includes ALLOW_STORE above)
  allowedEmails: [],

  // Add allowed usernames here if needed:
  allowedUsernames: [],

  // Add allowed user IDs here if needed:
  allowedUserIds: [],

  // Add allowed organization IDs here if needed:
  allowedOrganizationIds: [],

  // Secret passphrase that can be entered on the UI or via ?preview_access=<passphrase>
  previewPassphrase: "rentflow-preview",
};

/**
 * Checks whether a given user profile is allowed to view the marketplace & storefront.
 */
export function isProfileAllowed(user: any): boolean {
  if (!MARKETPLACE_ACCESS_CONFIG.enabled) {
    return true;
  }

  // Check if browser has saved preview passphrase
  if (typeof window !== "undefined") {
    try {
      const storedKey = localStorage.getItem("marketplace_preview_access");
      if (
        MARKETPLACE_ACCESS_CONFIG.previewPassphrase &&
        storedKey === MARKETPLACE_ACCESS_CONFIG.previewPassphrase
      ) {
        return true;
      }

      // Check URL search parameter
      const urlParams = new URLSearchParams(window.location.search);
      const urlKey = urlParams.get("preview_access");
      if (
        MARKETPLACE_ACCESS_CONFIG.previewPassphrase &&
        urlKey === MARKETPLACE_ACCESS_CONFIG.previewPassphrase
      ) {
        localStorage.setItem("marketplace_preview_access", urlKey);
        return true;
      }
    } catch {
      // Storage access error fallback
    }
  }

  if (!user) {
    return false;
  }

  // Check if backend flagged user as allow_store
  if (user.allow_store === true) {
    return true;
  }

  // Superuser check
  if (MARKETPLACE_ACCESS_CONFIG.allowSuperusers && user.is_superuser) {
    return true;
  }

  // Email check across ALLOW_STORE and allowedEmails
  const userEmail = (user.email || "").toLowerCase().trim();
  const allAllowedEmails = [
    ...ALLOW_STORE,
    ...MARKETPLACE_ACCESS_CONFIG.allowedEmails,
  ].map((e) => e.toLowerCase().trim());

  if (userEmail && allAllowedEmails.includes(userEmail)) {
    return true;
  }

  // Username check
  const userName = (user.username || "").toLowerCase().trim();
  if (
    userName &&
    MARKETPLACE_ACCESS_CONFIG.allowedUsernames.some(
      (name) => name.toLowerCase().trim() === userName,
    )
  ) {
    return true;
  }

  // User ID check
  if (
    user.id &&
    MARKETPLACE_ACCESS_CONFIG.allowedUserIds.includes(Number(user.id))
  ) {
    return true;
  }

  // Organization ID check
  if (
    user.organization_id &&
    MARKETPLACE_ACCESS_CONFIG.allowedOrganizationIds
      .map(String)
      .includes(String(user.organization_id))
  ) {
    return true;
  }

  return false;
}
