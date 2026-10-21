import { adsTxtBody } from "@/lib/ads";

/**
 * /ads.txt — required by AdSense once ads start serving, and checked during
 * site review.
 *
 * The content is derived from `ADSENSE_PUBLISHER_ID` in `src/lib/ads.ts`, so
 * this file can never disagree with the loader script in the page <head>.
 * When no publisher id is configured the route answers 404 rather than serving
 * an empty or placeholder file, because an empty ads.txt reads as
 * "no authorized sellers" and would work against the site.
 */
export const dynamic = "force-static";

export function GET(): Response {
  const body = adsTxtBody();

  if (!body) {
    return new Response("Not Found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
