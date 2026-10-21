/**
 * Advertising configuration.
 *
 * The site does NOT serve ads today. This file only describes where an ad unit
 * would go once the site is approved for a program such as Google AdSense.
 *
 * To enable a slot later:
 *   1. Get the site approved and copy your publisher id and ad unit ids.
 *   2. Set `ADS_ENABLED = true` and fill in `ADSENSE_CLIENT` plus the slot ids.
 *   3. Load the AdSense script once in `src/app/layout.tsx`.
 *
 * While `ADS_ENABLED` is false the <AdSlot /> component renders nothing at all,
 * so there is no empty space or placeholder box on the page.
 */

export const ADS_ENABLED = false;

/** Example format: "ca-pub-0000000000000000". */
export const ADSENSE_CLIENT = "";

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
