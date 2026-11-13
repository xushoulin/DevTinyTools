#!/usr/bin/env node
/**
 * Crawl every URL in the live sitemap and check the head of each page.
 *
 * Catches the regressions that a local build cannot: a title that only crosses
 * 60 characters once the site suffix is added, a meta description that grew
 * past 160, a missing canonical, H1 or structured-data block.
 *
 *   npm run audit
 *
 * HTML entities are decoded before measuring. `&amp;` and `&#x27;` are five and
 * six characters in the markup but one in the rendered title, so counting the
 * raw bytes reports limits that the reader never sees.
 */

const base = "https://www.shoulin.shop";
const sm = await (await fetch(`${base}/sitemap.xml`)).text();
const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const decode = (s) =>
  s
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const pick = (html, re) => decode((html.match(re) || [])[1] || "");
const rows = [];

for (const url of urls) {
  const res = await fetch(url);
  const html = await res.text();
  const title = pick(html, /<title>([^<]*)<\/title>/);
  const desc = pick(html, /<meta name="description" content="([^"]*)"/);
  const canon = pick(html, /<link rel="canonical" href="([^"]*)"/);
  const h1 = pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/).replace(/<[^>]+>/g, "").trim();
  const jsonld = (html.match(/application\/ld\+json/g) || []).length;
  const issues = [];
  if (res.status !== 200) issues.push(`status ${res.status}`);
  if (!title) issues.push("no title");
  else if (title.length > 60) issues.push(`title ${title.length}`);
  if (!desc) issues.push("no desc");
  else if (desc.length > 160) issues.push(`desc ${desc.length}`);
  if (!canon) issues.push("no canonical");
  if (!h1) issues.push("no h1");
  if (!jsonld) issues.push("no JSON-LD");
  rows.push({ url: url.replace(base, "") || "/", t: title.length, d: desc.length, issues });
}

console.log(`checked ${rows.length} urls`);
const bad = rows.filter((r) => r.issues.length);
for (const r of bad) console.log(`  ${r.url}  [${r.issues.join(", ")}]`);
console.log(bad.length ? `${bad.length} with issues` : "all clean");
console.log(
  "title range",
  Math.min(...rows.map((r) => r.t)),
  "-",
  Math.max(...rows.map((r) => r.t)),
  "| desc range",
  Math.min(...rows.map((r) => r.d)),
  "-",
  Math.max(...rows.map((r) => r.d)),
);
