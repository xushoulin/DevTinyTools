import type { Metadata } from "next";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

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
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}
