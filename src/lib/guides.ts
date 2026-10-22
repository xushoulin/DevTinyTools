/**
 * Guide registry.
 *
 * Same idea as `tools.ts`: navigation, the index page, the sitemap and the
 * "more guides" list all read from here, so a new guide cannot exist on disk
 * while being invisible everywhere else.
 *
 * Slugs are also the file name under `src/app/guides/<slug>/page.tsx`. There is
 * no dynamic route, because each guide is a hand-written page with its own
 * structure — a catch-all route would only add a lookup layer.
 */

export interface GuideDefinition {
  /** Last path segment; the page lives at `src/app/guides/<slug>/page.tsx`. */
  slug: string;
  /** Root-relative URL. */
  href: string;
  /** H1 and card title. */
  title: string;
  /** Short label for tight navigation contexts. */
  shortTitle: string;
  /** Meta description, kept under ~155 characters. */
  description: string;
  /** One or two sentences shown on the index card. */
  summary: string;
  /** Opening paragraph, rendered under the H1. */
  lede: string;
  /** ISO date, used for display and structured data. */
  publishedAt: string;
  updatedAt?: string;
  readingMinutes: number;
  topic: GuideTopic;
  /** The tool this guide is about, linked at the top and bottom. */
  relatedTool: { href: string; name: string };
}

export type GuideTopic = "Errors" | "Numbers" | "Payload size";

export const GUIDES: GuideDefinition[] = [
  {
    slug: "json-error-messages-explained",
    href: "/guides/json-error-messages-explained",
    title: "JSON parse error messages, decoded",
    shortTitle: "Error messages",
    description:
      "What “Unexpected token”, “Expected property name” and the other JSON.parse messages actually mean, with the exact input that triggers each one.",
    summary:
      "Seven real parser messages with the input that produces them, what the parser is complaining about, and the fix for each — including why some errors arrive with no line number at all.",
    lede:
      "A JSON error message tells you where the parser gave up, not what to change. This guide pairs the messages you are most likely to see with the input that produces them, so you can recognise the shape of the problem in a second instead of guessing.",
    publishedAt: "2026-10-22",
    readingMinutes: 8,
    topic: "Errors",
    relatedTool: { href: "/json-validator", name: "JSON Validator" },
  },
  {
    slug: "why-json-numbers-lose-precision",
    href: "/guides/why-json-numbers-lose-precision",
    title: "Why your JSON numbers change when you format them",
    shortTitle: "Number precision",
    description:
      "Integers above 2^53, reordered keys and silently dropped duplicates: what a JSON.parse round trip really does, and how to keep big IDs intact.",
    summary:
      "Formatting JSON is supposed to be lossless. For large integers, numeric-looking keys and duplicate members it is not. Here is exactly what changes and how to stop it.",
    lede:
      "You paste a payload, press Format, and an ID ends in a different digit. Nothing was corrupted — the document passed through JavaScript, where numbers are doubles and object keys have an order of their own. Knowing which transformations are unavoidable changes how you handle IDs, diffs and signatures.",
    publishedAt: "2026-10-22",
    readingMinutes: 9,
    topic: "Numbers",
    relatedTool: { href: "/json-formatter", name: "JSON Formatter" },
  },
  {
    slug: "json-minify-vs-gzip",
    href: "/guides/json-minify-vs-gzip",
    title: "Does minifying JSON actually save bandwidth?",
    shortTitle: "Minify vs gzip",
    description:
      "Minifying a 216 KB JSON file removes 43.7% of its bytes, yet only saves about 5% once gzip or brotli runs. Here is when each step is worth it.",
    summary:
      "Measured on a real 216 KB document: minification cuts 43.7% of the raw bytes, but only 10.8% after gzip and 4.9% after brotli. When the effort pays off — and when it does not.",
    lede:
      "Minifying JSON looks like an obvious win: fewer bytes, faster transfer. Then you measure it behind a real HTTP stack and the saving mostly disappears. These are the measurements, and the cases where the raw-byte reduction still matters.",
    publishedAt: "2026-10-22",
    readingMinutes: 7,
    topic: "Payload size",
    relatedTool: { href: "/json-minifier", name: "JSON Minifier" },
  },
];

export function getGuide(slug: string): GuideDefinition | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}

/** Guides other than the current one, for the "more guides" list. */
export function otherGuides(slug: string): GuideDefinition[] {
  return GUIDES.filter((guide) => guide.slug !== slug);
}

/** "2026-10-22" → "October 22, 2026", without pulling in a date library. */
export function formatGuideDate(iso: string): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day || month < 1 || month > 12) return iso;

  return `${months[month - 1]} ${day}, ${year}`;
}
