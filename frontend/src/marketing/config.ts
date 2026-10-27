/*
 * Marketing site settings, from the build environment (frontend .env):
 *   VITE_GA4_ID              Google Analytics 4 ID (G-XXXXXXXXXX)
 *   VITE_META_PIXEL_ID       Meta Pixel ID
 *   VITE_CONTACT_ENDPOINT    where /contact posts JSON (empty: opens email)
 *   VITE_WAITLIST_ENDPOINT   where the marketplace waitlist posts JSON
 * The cookie banner only appears when an analytics ID is set.
 */
const env = import.meta.env;

export const siteConfig = {
  ga4Id: (env.VITE_GA4_ID as string) || "",
  metaPixelId: (env.VITE_META_PIXEL_ID as string) || "",
  contactEndpoint: (env.VITE_CONTACT_ENDPOINT as string) || "",
  waitlistEndpoint: (env.VITE_WAITLIST_ENDPOINT as string) || "",
  consentVersion: 1,
};

export const analyticsEnabled = !!(siteConfig.ga4Id || siteConfig.metaPixelId);

let consentLoaded = false;

/** Load the consent banner + analytics script once, if any ID is set. */
export function loadConsent() {
  if (consentLoaded || !analyticsEnabled) return;
  consentLoaded = true;
  (window as any).NEOOPS_CONFIG = siteConfig;
  const s = document.createElement("script");
  s.src = "/site/consent.js";
  s.defer = true;
  document.head.appendChild(s);
}
