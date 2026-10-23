#!/usr/bin/env node
/**
 * Submit URLs to IndexNow.
 *
 * IndexNow is a shared endpoint used by Bing, Yandex, Naver and Seznam. It is
 * not used by Google — Google discovers pages through the sitemap and links,
 * and has no public push API.
 *
 * Usage:
 *   npm run indexnow                  # every URL in the live sitemap
 *   npm run indexnow -- /json-diff    # one path
 *   npm run indexnow -- https://www.shoulin.shop/guides
 *   npm run indexnow -- --dry-run     # print the payload, send nothing
 *
 * The key is read from the key file in public/, so there is nothing to
 * configure: the file name *is* the key, and IndexNow verifies it by fetching
 * https://<host>/<key>.txt and checking the contents match.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOST = (process.env.INDEXNOW_HOST ?? "https://www.shoulin.shop").replace(/\/+$/, "");
const ENDPOINT = "https://api.indexnow.org/indexnow";
const KEY_PATTERN = /^[a-f0-9]{32}\.txt$/;

function findKey() {
  const candidates = readdirSync(join(ROOT, "public")).filter((name) =>
    KEY_PATTERN.test(name),
  );

  if (candidates.length === 0) {
    throw new Error(
      "No IndexNow key file in public/. Expected a file named <32 hex chars>.txt.",
    );
  }
  if (candidates.length > 1) {
    throw new Error(
      `More than one key file in public/: ${candidates.join(", ")}. Keep exactly one.`,
    );
  }

  const name = candidates[0];
  const key = readFileSync(join(ROOT, "public", name), "utf8").trim();

  if (key !== name.replace(/\.txt$/, "")) {
    throw new Error(
      `${name} must contain exactly its own name as the key. IndexNow fetches that file and compares.`,
    );
  }

  return { key, keyLocation: `${HOST}/${name}` };
}

async function urlsFromSitemap() {
  const response = await fetch(`${HOST}/sitemap.xml`);

  if (!response.ok) {
    throw new Error(`sitemap.xml returned ${response.status}`);
  }

  const xml = await response.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());

  if (urls.length === 0) throw new Error("sitemap.xml contained no <loc> entries.");

  return urls;
}

function normalise(input) {
  const url = input.startsWith("http") ? input : `${HOST}${input.startsWith("/") ? "" : "/"}${input}`;

  if (!url.startsWith(`${HOST}/`) && url !== HOST) {
    throw new Error(`${url} does not belong to ${HOST}; IndexNow rejects the whole batch.`);
  }

  return url;
}

async function main() {
  const { key, keyLocation } = findKey();
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const args = argv.filter((arg) => !arg.startsWith("--"));
  const urlList = args.length > 0 ? args.map(normalise) : await urlsFromSitemap();
  const payload = { host: HOST, key, keyLocation, urlList };

  console.log(`Submitting ${urlList.length} URL(s) to IndexNow for ${HOST}`);
  for (const url of urlList) console.log(`  ${url}`);

  if (dryRun) {
    console.log("\n--dry-run: payload only, nothing sent.\n");
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // Node's fetch does not read HTTPS_PROXY before Node 24, so a machine that
    // only reaches the internet through a proxy fails here. Hand over a command
    // that will work, instead of a stack trace.
    console.error(`\nNetwork error: ${error.message}`);
    console.error("\nRetry with curl, which honours the system proxy:");
    console.error(
      `  curl -sS -X POST ${ENDPOINT} -H 'Content-Type: application/json' -d '${JSON.stringify(payload)}'`,
    );
    process.exitCode = 1;
    return;
  }

  const body = await response.text();
  const meaning = {
    200: "OK — URLs accepted.",
    202: "Accepted — key is valid but URLs are still being validated.",
    400: "Bad request — malformed payload.",
    403: "Forbidden — the key file could not be fetched or its contents do not match.",
    422: "Unprocessable — URLs do not belong to the host, or the key does not match.",
    429: "Too many requests — slow down and retry later.",
  }[response.status];

  console.log(`\nHTTP ${response.status}${meaning ? ` — ${meaning}` : ""}`);
  if (body.trim()) console.log(body.trim());

  if (!response.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
