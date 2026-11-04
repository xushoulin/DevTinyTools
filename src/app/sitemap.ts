import type { MetadataRoute } from "next";
import { CORE_PAGE_DATES, TOOL_PAGE_DATES } from "@/lib/content-dates";
import { GUIDES } from "@/lib/guides";
import { absoluteUrl } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

/**
 * Static sitemap covering the pages that actually exist. Tool entries are
 * derived from the shared registry so a new tool cannot be forgotten here.
 *
 * Every date is the last edit of that page. A build timestamp would be simpler
 * and wrong: it claims all ten non-guide URLs changed on the same second at
 * every deploy, and a lastmod that is visibly not about the page is ignored.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const core: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(CORE_PAGE_DATES["/"]),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/about"),
      lastModified: new Date(CORE_PAGE_DATES["/about"]),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/contact"),
      lastModified: new Date(CORE_PAGE_DATES["/contact"]),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: absoluteUrl("/privacy-policy"),
      lastModified: new Date(CORE_PAGE_DATES["/privacy-policy"]),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const tools: MetadataRoute.Sitemap = TOOLS.map((tool) => ({
    url: absoluteUrl(tool.href),
    lastModified: new Date(TOOL_PAGE_DATES[tool.href]),
    changeFrequency: "monthly",
    priority: 0.9,
  }));

  const guides: MetadataRoute.Sitemap = GUIDES.map((guide) => ({
    url: absoluteUrl(guide.href),
    lastModified: new Date(guide.updatedAt ?? guide.publishedAt),
    changeFrequency: "yearly",
    priority: 0.7,
  }));

  const guidesIndex: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/guides"),
      lastModified: new Date(CORE_PAGE_DATES["/guides"]),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  return [...tools, ...guidesIndex, ...guides, ...core];
}
