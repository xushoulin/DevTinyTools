import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

/**
 * Static sitemap covering the pages that actually exist. Tool entries are
 * derived from the shared registry so a new tool cannot be forgotten here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const core: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/about"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/contact"),
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: absoluteUrl("/privacy-policy"),
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const tools: MetadataRoute.Sitemap = TOOLS.map((tool) => ({
    url: absoluteUrl(tool.href),
    lastModified,
    changeFrequency: "monthly",
    priority: 0.9,
  }));

  return [...tools, ...core];
}
