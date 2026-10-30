import { buildLlmsTxt } from "@/lib/llms";

/**
 * `/llms.txt` is a plain-text summary for language models and answer engines
 * (https://llmstxt.org). It is generated from the tool and guide registries at
 * build time, so it cannot fall out of sync with the site.
 *
 * `force-static` keeps it out of the server runtime: the file is identical for
 * every request and there is nothing to compute per visit.
 */
export const dynamic = "force-static";

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
