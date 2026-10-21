import { AD_SLOTS, ADSENSE_CLIENT, isSlotActive, type AdSlotKey } from "@/lib/ads";

/**
 * Reserved advertising region.
 *
 * Renders nothing at all unless a slot is explicitly configured in
 * `src/lib/ads.ts`, so an unconfigured site never shows an empty box. The
 * component is intentionally excluded from the tool panes: it sits below the
 * tool, between content sections, or above the footer.
 */
export function AdSlot({ slot, className = "" }: { slot: AdSlotKey; className?: string }) {
  if (!isSlotActive(slot)) return null;

  const definition = AD_SLOTS[slot];

  return (
    <aside
      aria-label={definition.label}
      className={`my-10 flex flex-col items-center gap-2 ${className}`}
    >
      <span className="text-[10px] uppercase tracking-wider text-slate-400">
        {definition.label}
      </span>
      <ins
        className="adsbygoogle block w-full max-w-3xl"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={definition.slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
