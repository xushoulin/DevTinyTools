import type { Metadata } from "next";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

/**
 * Single source for the social preview image. Served from `public/og-image.png`
 * (1200×630) and attached explicitly to both Open Graph and Twitter metadata,
 * because a per-page `openGraph` object replaces the layout's — including its
 * images — rather than merging into it.
 */
export const OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "DevTinyTools — free browser-based JSON formatting, validation and minification tools.",
} as const;

interface PageMetadataInput {
  title: string;
  description: string;
  /** Root-relative path, e.g. "/json-formatter". */
  path: string;
}

/**
 * Builds per-page metadata. Canonicals are emitted as root-relative paths and
 * resolved against `metadataBase` in the root layout, so they always match the
 * configured production origin.
 */
export function pageMetadata({ title, description, path }: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title,
      description,
      locale: "en_US",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}
