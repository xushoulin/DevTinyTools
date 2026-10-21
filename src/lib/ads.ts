/**
 * Advertising configuration.
 *
 * Two independent switches:
 *
 * - `ADSENSE_PUBLISHER_ID` loads Google's AdSense loader script once in the
 *   page <head> and publishes /ads.txt. This is what AdSense needs in order to
 *   verify site ownership and review the site. It does not display any ad on
 *   its own, because no ad unit is rendered until the slots below are filled
 *   in.
 * - `ADS_ENABLED` plus a per-slot id turns a reserved region into a real ad
 *   unit. Those regions stay empty until both are set, so the site never shows
 *   an empty placeholder box.
 *
 * To stop serving AdSense entirely, set `ADSENSE_PUBLISHER_ID` to "". The
 * script tag disappears from every page, /ads.txt starts returning 404, and the
 * privacy policy reverts to its "no advertising code" wording automatically —
 * because the policy reads this same constant.
 */

/** Publisher id from AdSense → Account → Settings → Account information. */
export const ADSENSE_PUBLISHER_ID = "pub-2622415797490761";

/** The `ca-` prefixed form used by the loader script and data attributes. */
export const ADSENSE_CLIENT = ADSENSE_PUBLISHER_ID
  ? `ca-${ADSENSE_PUBLISHER_ID}`
  : "";

/** True once a publisher id exists, i.e. the loader script should be emitted. */
export const ADSENSE_SCRIPT_ENABLED = ADSENSE_CLIENT !== "";

/** Ad units are still off: no slot ids have been created yet. */
export const ADS_ENABLED = false;

export type AdSlotKey = "toolBelow" | "contentMiddle" | "beforeFooter";

export interface AdSlotDefinition {
  /** Ad unit id from the ad network dashboard. */
  slotId: string;
  /** Accessible label for the region, not shown as marketing copy. */
  label: string;
}

export const AD_SLOTS: Record<AdSlotKey, AdSlotDefinition> = {
  toolBelow: { slotId: "", label: "Advertisement" },
  contentMiddle: { slotId: "", label: "Advertisement" },
  beforeFooter: { slotId: "", label: "Advertisement" },
};

export function isSlotActive(key: AdSlotKey): boolean {
  if (!ADS_ENABLED) return false;
  if (!ADSENSE_CLIENT) return false;
  return Boolean(AD_SLOTS[key]?.slotId);
}

/** Body of /ads.txt. Google's certification authority id is fixed. */
export function adsTxtBody(): string | null {
  if (!ADSENSE_PUBLISHER_ID) return null;
  return `google.com, ${ADSENSE_PUBLISHER_ID}, DIRECT, f08c47fec0942fa0\n`;
}
