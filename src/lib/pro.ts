/**
 * DevTinyTools Pro configuration.
 *
 * The Pro tier lifts per-document limits on conversion tools. Everything
 * stays client-side; a purchase is a licence key, not an account, so the
 * "no sign-up" principle holds.
 *
 * Checkout is Lemon Squeezy (merchant of record — they remit VAT/sales tax on
 * our behalf). The checkout URL is a build-time env var so no secrets or
 * store-specific code live in the repo:
 *
 *   NEXT_PUBLIC_PRO_CHECKOUT_URL=https://xxxx.lemonsqueezy.com/buy/xxxx
 *
 * When the variable is unset the UI renders an honest "coming soon" state
 * instead of a dead link, and the free limits still apply.
 */

/** Free-tier cap per document, in characters (roughly 1 MB of JSON). */
export const CSV_FREE_CHAR_LIMIT = 1_000_000;

/** Pro-tier cap per document, in characters (roughly 10 MB of JSON). */
export const CSV_PRO_CHAR_LIMIT = 10_000_000;

/** Free-tier cap per diff side, in characters — the same as the global default. */
export const DIFF_FREE_CHAR_LIMIT = 2_000_000;

/** Pro-tier cap per diff side, in characters (roughly 10 MB of JSON). */
export const DIFF_PRO_CHAR_LIMIT = 10_000_000;

/** Free-tier cap for type generation, in characters (roughly 1 MB of JSON). */
export const TYPE_FREE_CHAR_LIMIT = 1_000_000;

/** Pro-tier cap for type generation, in characters (roughly 10 MB of JSON). */
export const TYPE_PRO_CHAR_LIMIT = 10_000_000;

/** Free-tier cap for Go struct generation, in characters (roughly 1 MB of JSON). */
export const GO_FREE_CHAR_LIMIT = 1_000_000;

/** Pro-tier cap for Go struct generation, in characters (roughly 10 MB of JSON). */
export const GO_PRO_CHAR_LIMIT = 10_000_000;

/** Free-tier cap for Java POJO generation, in characters (roughly 1 MB of JSON). */
export const JAVA_FREE_CHAR_LIMIT = 1_000_000;

/** Pro-tier cap for Java POJO generation, in characters (roughly 10 MB of JSON). */
export const JAVA_PRO_CHAR_LIMIT = 10_000_000;

export const PRO_PRICE_MONTHLY = "$9";
export const PRO_PRICE_LIFETIME = "$29";

/** Live Lemon Squeezy checkout for DevTinyTools Pro ($29 lifetime licence).
 *  Kept as a fallback so the hosted deployment works without extra env wiring;
 *  NEXT_PUBLIC_PRO_CHECKOUT_URL still overrides it when set. */
const DEFAULT_PRO_CHECKOUT_URL =
  "https://devtinytools.lemonsqueezy.com/checkout/buy/79322634-c55f-4048-8640-62263e0bf326";

/** Normalised checkout URL, or null when Pro is not wired up yet. */
export function getProCheckoutUrl(): string | null {
  const raw = (process.env.NEXT_PUBLIC_PRO_CHECKOUT_URL ?? DEFAULT_PRO_CHECKOUT_URL).trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}
