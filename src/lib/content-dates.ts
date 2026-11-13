/**
 * Last edit date for every page the sitemap lists outside /guides.
 *
 * `lastmod` is a claim about the page, not about the build. Deriving it from
 * the clock makes these ten URLs announce the same second on every deployment,
 * which is not true, and a crawler that sees a date it cannot trust stops
 * reading the field at all. Guide dates already come from the registry, so only
 * these were wrong.
 *
 * Each value is the date of the last commit that touched the page. Bump it when
 * the page itself changes — not when the code around it does.
 */
export const CORE_PAGE_DATES = {
  "/": "2026-10-29",
  "/about": "2026-10-23",
  "/contact": "2026-10-21",
  "/privacy-policy": "2026-10-22",
  "/guides": "2026-10-29",
} as const;

export const TOOL_PAGE_DATES: Record<string, string> = {
  "/json-formatter": "2026-10-22",
  "/json-validator": "2026-10-29",
  "/json-minifier": "2026-10-22",
  "/json-diff": "2026-10-29",
  "/json-escape": "2026-11-02",
  "/json-to-csv": "2026-11-12",
  "/json-to-typescript": "2026-11-13",
};
