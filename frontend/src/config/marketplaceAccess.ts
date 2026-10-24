/**
 * Access control configuration for the Marketplace and Public Storefront.
 *
 * When `enabled` is true, a "Coming Soon" mask is displayed over the
 * marketplace and storefront for all users, EXCEPT those whose profiles
 * are in the allowed store list (ALLOW_STORE).
 */

/**
 * List of email profiles who can see the marketplace to test.
 * Add emails here or in backend `config/settings.py` (ALLOW_STORE).
 */
export const ALLOW_STORE: string[] = [
  // Add allowed email addresses here:
];

export interface MarketplaceAccessConfig {
  /** Master switch: if true, Coming Soon mask is active. If false, open to everyone. */
  enabled: boolean;

  /** When true, Django superusers / admins automatically see the store. */
  allowSuperusers: boolean;

  /** List of user emails allowed to access (case-insensitive). */
  allowedEmails: string[];

  /** List of usernames allowed to access (case-insensitive). */
  allowedUsernames: string[];

  /** List of numeric user IDs allowed to access. */
  allowedUserIds: number[];

  /** List of organization IDs whose members can view the marketplace and storefront. */
  allowedOrganizationIds: (string | number)[];
}

export const MARKETPLACE_ACCESS_CONFIG: MarketplaceAccessConfig = {
  enabled: true,
  allowSuperusers: true,

  // Allowed email addresses
  allowedEmails: [],

  // Add allowed usernames here if needed:
  allowedUsernames: [],

  // Add allowed user IDs here if needed:
  allowedUserIds: [],

  // Add allowed organization IDs here if needed:
  allowedOrganizationIds: [],
};

/**
 * Checks whether a given user profile is allowed to view the marketplace & storefront.
 */
export function isProfileAllowed(user: any): boolean {
  if (!MARKETPLACE_ACCESS_CONFIG.enabled) {
    return true;
  }

  if (!user) {
    return false;
  }

  // Check if backend flagged user as allow_store from Django settings.ALLOW_STORE
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
