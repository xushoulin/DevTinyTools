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
  /**
   * Curated cross-links: two or three slugs that answer the next question a
   * reader of this page actually has. Deliberately hand-picked rather than
   * "everything else", because a flat list of links on every page tells search
   * engines nothing about which pages belong together.
   */
  related: string[];
}

/** Every topic a guide may declare. Kept as data so the tests can assert on it. */
export const GUIDE_TOPICS = [
  "Errors",
  "Numbers",
  "Payload size",
  "Diffing",
  "Syntax",
  "Converting",
  "Typing",
] as const;

export type GuideTopic = (typeof GUIDE_TOPICS)[number];

export const GUIDES: GuideDefinition[] = [
  {
    slug: "json-error-messages-explained",
    href: "/guides/json-error-messages-explained",
    title: "JSON parse errors: what each message means",
    shortTitle: "Parse errors",
    description:
      "What “Unexpected token”, “Expected property name” and the other JSON.parse messages actually mean, with the exact input that triggers each one.",
    summary:
      "Seven real parser messages with the input that produces them, what the parser is complaining about, and the fix for each — including why some errors arrive with no line number at all.",
    lede:
      "A JSON error message tells you where the parser gave up, not what to change. This guide pairs the messages you are most likely to see with the input that produces them, so you can recognise the shape of the problem in a second instead of guessing.",
    publishedAt: "2026-10-22",
    updatedAt: "2026-10-29",
    readingMinutes: 8,
    topic: "Errors",
    relatedTool: { href: "/json-validator", name: "JSON Validator" },
    related: [
      "json5-trailing-commas-and-comments",
      "json-unexpected-token-at-position-0",
      "json-unexpected-end-of-json-input",
    ],
  },
  {
    slug: "why-json-numbers-lose-precision",
    href: "/guides/why-json-numbers-lose-precision",
    title: "Why JSON numbers lose precision above 2^53",
    shortTitle: "Number precision",
    description:
      "Integers above 2^53, reordered keys and silently dropped duplicates: what a JSON.parse round trip really does, and how to keep big IDs intact.",
    summary:
      "Formatting JSON is supposed to be lossless. For large integers, numeric-looking keys and duplicate members it is not. Here is exactly what changes and how to stop it.",
    lede:
      "You paste a payload, press Format, and an ID ends in a different digit. Nothing was corrupted — the document passed through JavaScript, where numbers are doubles and object keys have an order of their own. Knowing which transformations are unavoidable changes how you handle IDs, diffs and signatures.",
    publishedAt: "2026-10-22",
    updatedAt: "2026-10-29",
    readingMinutes: 9,
    topic: "Numbers",
    relatedTool: { href: "/json-formatter", name: "JSON Formatter" },
    related: [
      "how-to-compare-two-json-files",
      "convert-json-to-go-struct",
      "convert-json-to-csv",
    ],
  },
  {
    slug: "json-minify-vs-gzip",
    href: "/guides/json-minify-vs-gzip",
    title: "Does minifying JSON beat gzip and brotli?",
    shortTitle: "Minify vs gzip",
    description:
      "Minifying a 216 KB JSON file removes 43.7% of its bytes, yet only saves about 5% once gzip or brotli runs. Here is when each step is worth it.",
    summary:
      "Measured on a real 216 KB document: minification cuts 43.7% of the raw bytes, but only 10.8% after gzip and 4.9% after brotli. When the effort pays off — and when it does not.",
    lede:
      "Minifying JSON looks like an obvious win: fewer bytes, faster transfer. Then you measure it behind a real HTTP stack and the saving mostly disappears. These are the measurements, and the cases where the raw-byte reduction still matters.",
    publishedAt: "2026-10-22",
    updatedAt: "2026-10-29",
    readingMinutes: 7,
    topic: "Payload size",
    relatedTool: { href: "/json-minifier", name: "JSON Minifier" },
    related: [
      "how-to-compare-two-json-files",
      "json-error-messages-explained",
    ],
  },
  {
    slug: "json-unexpected-token-at-position-0",
    href: "/guides/json-unexpected-token-at-position-0",
    title: "Unexpected token '<' in JSON at position 0",
    shortTitle: "Position 0",
    description:
      "Your API returned HTML, not JSON. The messages behind an SPA fallback, a 404 page, a proxy error and a byte-order mark — and how to see the body.",
    summary:
      "Position 0 means the first character was not a brace, a bracket or a quote. That is almost never a broken document — it is the wrong document: an error page, a single-page-app fallback or a login redirect.",
    lede:
      "A parser that fails at position 0 read nothing at all. Whatever arrived is not slightly malformed JSON; it is a different document entirely, and the message names only the character it tripped over. Here is how to find out what really came back, and why a 200 response is the worst case.",
    publishedAt: "2026-10-29",
    readingMinutes: 8,
    topic: "Errors",
    relatedTool: { href: "/json-validator", name: "JSON Validator" },
    related: [
      "json-unexpected-end-of-json-input",
      "json-decode-error",
      "json5-trailing-commas-and-comments",
    ],
  },
  {
    slug: "json-unexpected-end-of-json-input",
    href: "/guides/json-unexpected-end-of-json-input",
    title: "Unexpected end of JSON input: what it means",
    shortTitle: "End of input",
    description:
      "Six truncated inputs, three engines: only three produce this message. What the parser state tells you, and why an empty response body is the usual cause.",
    summary:
      "The message describes the parser's state, not the document. Three other kinds of truncation produce completely different sentences, and the most common real cause is a body of length zero rather than missing bytes.",
    lede:
      "This error fires when the input ends at a point where a value was still due. Everything else people assume about it — that the JSON was cut off, that bytes are missing from the end — describes only three of six truncations, and none of the cases that actually get reported.",
    publishedAt: "2026-11-02",
    readingMinutes: 8,
    topic: "Errors",
    relatedTool: { href: "/json-validator", name: "JSON Validator" },
    related: [
      "json-unexpected-token-at-position-0",
      "json-decode-error",
      "json-error-messages-explained",
    ],
  },
  {
    slug: "json-decode-error",
    href: "/guides/json-decode-error",
    title: "JSON decode error: what each message means",
    shortTitle: "JSONDecodeError",
    description:
      "Every JSONDecodeError message measured on CPython 3.13, why four different problems all report char 0, and the one message that changed in 3.13.",
    summary:
      "Four unrelated problems collapse into one position-zero message, while V8 names the offending character in each case. The trailing comma wording also changed in 3.13, column included.",
    lede:
      "Python reports this error for an empty body, for a web page, and for a document that is correct except for one comma — and the sentence is identical all three times. What separates them is the first byte, not the wording.",
    publishedAt: "2026-11-03",
    readingMinutes: 9,
    topic: "Errors",
    relatedTool: { href: "/json-validator", name: "JSON Validator" },
    related: [
      "json-unexpected-end-of-json-input",
      "json-unexpected-token-at-position-0",
      "json5-trailing-commas-and-comments",
    ],
  },
  {
    slug: "how-to-compare-two-json-files",
    href: "/guides/how-to-compare-two-json-files",
    title: "Compare two JSON files, ignoring key order",
    shortTitle: "Comparing files",
    description:
      "Text diffs break on formatting and key order. What a structural comparison should report, why array order is a choice, and the difference parsing cannot see.",
    summary:
      "Two documents can be identical and still fail a text diff, or differ by one digit and pass a structural one. Both failures come from the same place: the comparison is done on the wrong representation.",
    lede:
      "Reformatting a file rewrites every line, a map serialised by another language reorders every key, and parsing turns 16-digit IDs into doubles. A useful comparison has to decide what counts as a difference before it looks at one.",
    publishedAt: "2026-10-29",
    readingMinutes: 9,
    topic: "Diffing",
    relatedTool: { href: "/json-diff", name: "JSON Diff" },
    related: [
      "why-json-numbers-lose-precision",
      "json-minify-vs-gzip",
      "json5-trailing-commas-and-comments",
    ],
  },
  {
    slug: "json5-trailing-commas-and-comments",
    href: "/guides/json5-trailing-commas-and-comments",
    title: "Trailing commas and comments: why JSON5 fails",
    shortTitle: "JSON5 vs JSON",
    description:
      "The exact messages for trailing commas, comments, single quotes and unquoted keys, which files legitimately allow them, and how to convert without hand-editing.",
    summary:
      "Four dialects share the name JSON and only one of them is JSON. What JSONC and JSON5 add, which config files allow what, and the messages you get when they reach a strict parser.",
    lede:
      "The file came from a configuration editor that accepts comments, or from a console that printed a JavaScript object, or from a colleague who writes JSON5 without knowing it has a name. A strict parser accepts none of it, and its complaints are easy to misread.",
    publishedAt: "2026-10-29",
    readingMinutes: 8,
    topic: "Syntax",
    relatedTool: { href: "/json-validator", name: "JSON Validator" },
    related: [
      "json-error-messages-explained",
      "json-unexpected-token-at-position-0",
      "json-decode-error",
    ],
  },
  {
    slug: "convert-json-to-csv",
    href: "/guides/convert-json-to-csv",
    title: "Converting JSON to CSV: what breaks on the way",
    shortTitle: "JSON to CSV",
    description:
      "CSV has no types and no nesting. The IDs Excel silently rounds, the leading zeros it eats, and the quoting rules a naive converter misses.",
    summary:
      "A conversion that opens fine can still be wrong: 19-digit IDs rounded by Excel, ZIP codes losing their leading zero, nested objects flattened past recognition. Each failure has a specific cause and a specific fix.",
    lede:
      "JSON and CSV look interchangeable because both are text, but they model data completely differently: one has types and nesting, the other has neither. Most conversion bugs are not converter bugs at all — they are the two formats disagreeing about what a value is.",
    publishedAt: "2026-11-12",
    readingMinutes: 8,
    topic: "Converting",
    relatedTool: { href: "/json-to-csv", name: "JSON to CSV" },
    related: [
      "why-json-numbers-lose-precision",
      "generate-typescript-types-from-json",
    ],
  },
  {
    slug: "generate-typescript-types-from-json",
    href: "/guides/generate-typescript-types-from-json",
    title: "JSON to TypeScript: your sample is not a schema",
    shortTitle: "Typing JSON",
    description:
      "A generated interface is only as good as the sample behind it. What merging two responses changes, and the five things no generator can decide for you.",
    summary:
      "One response produces a clean interface that compiles. The next omits a field and it crashes. The gap between those two outcomes is decided by how many samples the generator saw — and by four questions it cannot answer alone.",
    lede:
      "Generating TypeScript from JSON feels like a solved problem until the second response arrives with a field missing. The interface did not change; the data did. This guide is about the gap between a type that compiles and a type that is true, and how to tell which one you have.",
    publishedAt: "2026-11-13",
    readingMinutes: 9,
    topic: "Typing",
    relatedTool: { href: "/json-to-typescript", name: "JSON to TypeScript" },
    related: [
      "convert-json-to-go-struct",
      "convert-json-to-csv",
      "why-json-numbers-lose-precision",
    ],
  },
  {
    slug: "convert-json-to-go-struct",
    href: "/guides/convert-json-to-go-struct",
    title: "JSON to Go structs: what the tags cannot say",
    shortTitle: "Typing Go",
    description:
      "Why every number crosses encoding/json as a float64, what omitempty really skips, and the tag forms that separate absent keys from null ones.",
    summary:
      "A generated struct compiles and unmarshals the sample, then quietly returns zero values for keys that were never sent. The three places JSON and Go disagree hard enough to lose data — numbers, absence, names — and the tags that encode each decision.",
    lede:
      "A struct generated from a JSON sample looks finished until the endpoint sends a record that omits a field. Nothing errors; the field just holds a zero value that means nothing. This guide is about the three places where JSON and Go disagree hard enough to lose data, and the tags that let you decide, per field, what “not there” means.",
    publishedAt: "2026-11-13",
    readingMinutes: 9,
    topic: "Typing",
    relatedTool: { href: "/json-to-go", name: "JSON to Go" },
    related: [
      "generate-typescript-types-from-json",
      "why-json-numbers-lose-precision",
      "convert-json-to-csv",
    ],
  },
  {
    slug: "convert-json-to-java-pojo",
    href: "/guides/convert-json-to-java-pojo",
    title: "JSON to Java POJOs: primitive or boxed, and why it matters",
    shortTitle: "Typing Java",
    description:
      "Primitive int hides a missing key behind 0. What Jackson does with null and absent values, why nested classes must be static, and when a record beats a POJO.",
    summary:
      "A generated POJO with int and double fields compiles, binds the sample and then answers 0 where the document said nothing. What Jackson actually does with null, absent and zero — and the four declarations that keep them apart.",
    lede:
      "Java has no way to write “this key was not sent” in an int, and Jackson will not complain: it fills the primitive with 0 and moves on. That single decision, made per field and invisible in the sample, is the difference between a model that reports the document and one that invents values for it.",
    publishedAt: "2026-11-13",
    readingMinutes: 9,
    topic: "Typing",
    relatedTool: { href: "/json-to-java", name: "JSON to Java" },
    related: [
      "convert-json-to-go-struct",
      "convert-json-to-csharp-class",
      "generate-typescript-types-from-json",
    ],
  },
  {
    slug: "convert-json-to-csharp-class",
    href: "/guides/convert-json-to-csharp-class",
    title: "JSON to C#: nullable annotations, CS8618 and JsonElement",
    shortTitle: "Typing C#",
    description:
      "Why a required property needs a default, what string? promises, and why a mixed-type field becomes a JsonElement that dies with its document.",
    summary:
      "System.Text.Json binds by exact spelling, fills missing keys with whatever the initialiser said, and turns an object-typed property into a JsonElement whose lifetime is shorter than the object that holds it. The three places a generated class file is wrong by default.",
    lede:
      "A generated C# class compiles under #nullable enable and binds the sample response, which makes it look finished. What it does not tell you is that a missing key leaves an initialised default in place, that a mixed-type field is a view into a document someone else may dispose, and that required means something the compiler can enforce if you ask it to.",
    publishedAt: "2026-11-13",
    readingMinutes: 9,
    topic: "Typing",
    relatedTool: { href: "/json-to-csharp", name: "JSON to C#" },
    related: [
      "convert-json-to-java-pojo",
      "generate-typescript-types-from-json",
      "convert-json-to-go-struct",
    ],
  },
];

export function getGuide(slug: string): GuideDefinition | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}

/** Guides other than the current one, for the "more guides" list. */
export function otherGuides(slug: string, exclude: string[] = []): GuideDefinition[] {
  const skip = new Set([slug, ...exclude]);
  return GUIDES.filter((guide) => !skip.has(guide.slug));
}

/**
 * Resolve a guide's curated cross-links, in the order they were declared.
 * Slugs that do not resolve are dropped rather than rendered as dead links —
 * the registry test asserts there are none.
 */
export function relatedGuides(guide: GuideDefinition): GuideDefinition[] {
  return guide.related
    .map((slug) => getGuide(slug))
    .filter((item): item is GuideDefinition => item !== undefined);
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
