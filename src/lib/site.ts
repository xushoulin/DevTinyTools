/**
 * Site-wide configuration. Values here are static strings so pages can stay
 * fully static; only the site URL is configurable through an environment
 * variable at build time.
 */

export const SITE_NAME = "DevTinyTools";
export const SITE_TAGLINE = "Free Online Developer Tools";
export const SITE_DESCRIPTION =
  "Small, fast developer tools that run entirely in your browser. Format, validate and minify JSON without uploading your data.";

/**
 * Used when NEXT_PUBLIC_SITE_URL is missing, so production builds never emit a
 * localhost canonical URL. Replace with the real domain in Vercel project
 * settings once a custom domain is attached.
 */
export const FALLBACK_SITE_URL = "https://devtinytools.vercel.app";

/**
 * Contact address is optional; we never invent one when it is not configured.
 *
 * There are two ways to set it, pick either:
 *
 * 1. Set the environment variable NEXT_PUBLIC_CONTACT_EMAIL (exact ASCII name,
 *    no trailing space or colon) in Vercel or in `.env.local`. Requires a
 *    rebuild, because public env vars are inlined at build time.
 * 2. Edit `CONTACT_EMAIL_FALLBACK` below and push — Vercel redeploys on push,
 *    so no dashboard access is needed.
 */
const CONTACT_EMAIL_FALLBACK: string | null = null;

/** Reject obviously broken values so a stray "：" or space cannot leak into a mailto link. */
export function normalizeContactEmail(
  value: string | null | undefined,
): string | null {
  if (!value) return null;

  // Deliberately ASCII-only: a full-width colon or a smart quote copied from a
  // chat message must be rejected, not rendered into a broken mailto link.
  const trimmed = value.trim();
  const isEmail =
    /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(
      trimmed,
    );

  return isEmail ? trimmed : null;
}

/**
 * Resolve the public contact address. Returns null when nothing usable is
 * configured, so callers can render an honest "not published yet" state.
 */
export function getContactEmail(): string | null {
  return (
    normalizeContactEmail(process.env.NEXT_PUBLIC_CONTACT_EMAIL) ??
    normalizeContactEmail(CONTACT_EMAIL_FALLBACK)
  );
}

function normalizeUrl(value: string | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    // Trailing slash would produce "//" when joined with a path.
    return parsed.origin + parsed.pathname.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function isLocalHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

/**
 * Resolve the canonical origin for the site.
 *
 * - Prefers NEXT_PUBLIC_SITE_URL.
 * - In production, refuses localhost so a misconfigured env cannot publish
 *   localhost canonical tags.
 * - Falls back to the Vercel domain, then to a local dev URL.
 */
export function resolveSiteUrl(): string {
  const configured = normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const isProduction = process.env.NODE_ENV === "production";

  if (configured) {
    if (isProduction && isLocalHost(configured)) {
      return FALLBACK_SITE_URL;
    }
    return configured;
  }

  return isProduction ? FALLBACK_SITE_URL : "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

/** Absolute URL helper for canonicals, Open Graph tags and the sitemap. */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${suffix === "/" ? "" : suffix}` || SITE_URL;
}

export const PRIVACY_LAST_UPDATED = "October 21, 2026";
