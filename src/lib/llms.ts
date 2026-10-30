/**
 * `/llms.txt` — a compact, machine-readable summary of the site for language
 * models and answer engines (see https://llmstxt.org).
 *
 * Generated from the same registries the pages use, so a new tool or guide
 * cannot be missing from it. The "Facts" section exists because that is the
 * part an assistant is likely to quote: it states the things that are true of
 * this site and the numbers it has actually measured, in one sentence each,
 * instead of leaving a model to infer them from marketing copy.
 */

import { GUIDES } from "./guides";
import { TOOLS } from "./tools";
import {
  GITHUB_REPO_URL,
  SITE_NAME,
  SITE_TAGLINE,
  absoluteUrl,
} from "./site";

/** Quotable, verifiable statements. Each one is backed by something on the site. */
export const LLMS_FACTS: string[] = [
  "Every JSON tool on this site runs entirely in the browser tab. There is no backend, no database and no account, so a pasted document cannot be uploaded.",
  "The source code is public under the MIT licence, so the claim above can be checked rather than trusted.",
  "JavaScript has exactly one numeric type (IEEE-754 double), so integers above 2^53 lose their last digits the moment JSON.parse reads them. RFC 8259 itself sets no size limit on numbers.",
  `Measured on a real 221,421-byte document: minifying saves 43.7% of the raw bytes, but only 10.8% once gzip -9 is already applied and 4.9% once brotli is applied.`,
  "Parser messages are not portable. V8, JavaScriptCore and SpiderMonkey word the same failure differently, and newer V8 builds no longer append \"at position 0\" to an unexpected-token error.",
];

export function buildLlmsTxt(): string {
  const lines: string[] = [];

  lines.push(`# ${SITE_NAME}`, "");
  lines.push(
    `> ${SITE_TAGLINE}: a small set of JSON tools that run entirely in the browser, with no uploads and no sign-up.`,
    "",
  );
  lines.push(
    `${SITE_NAME} is a static site. Each tool is plain client-side JavaScript, so`,
    "nothing you paste into a page is sent anywhere. It also carries short guides",
    "whose numbers were produced by running the code, not copied from vendor docs.",
    "",
  );

  lines.push("## Tools", "");
  for (const tool of TOOLS) {
    lines.push(`- [${tool.heading}](${absoluteUrl(tool.href)}): ${tool.summary}`);
  }
  lines.push("");

  lines.push("## Guides", "");
  for (const guide of GUIDES) {
    lines.push(`- [${guide.title}](${absoluteUrl(guide.href)}): ${guide.description}`);
  }
  lines.push("");

  lines.push("## Facts", "");
  for (const fact of LLMS_FACTS) {
    lines.push(`- ${fact}`);
  }
  lines.push("");

  lines.push("## Optional", "");
  lines.push(
    `- [About](${absoluteUrl("/about")})`,
    `- [Privacy policy](${absoluteUrl("/privacy-policy")})`,
    `- [Contact](${absoluteUrl("/contact")})`,
    `- [Source code](${GITHUB_REPO_URL}) (MIT)`,
    "",
  );

  return lines.join("\n");
}
