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
 * Used when neither NEXT_PUBLIC_SITE_URL nor the Vercel-provided production
 * domain is available, so production builds never emit a localhost canonical
 * URL. Replace with the real domain once a custom domain is attached.
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
/**
 * Vercel injects the project's production domain at build time, without any
 * manual configuration. It is the shortest custom domain, or the
 * `*.vercel.app` domain when no custom domain exists, and it is present on
 * preview deployments too — exactly what a canonical URL should point at.
 * The value never includes the protocol, so it is normalised here.
 */
function vercelProductionUrl(
  env: Record<string, string | undefined>,
): string | null {
  const raw =
    env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ??
    env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return normalizeUrl(withScheme);
}

/**
 * Resolve the canonical origin for the site.
 *
 * Priority:
 * 1. `NEXT_PUBLIC_SITE_URL` — the explicit override, use this for a custom domain.
 * 2. `VERCEL_PROJECT_PRODUCTION_URL` — supplied by Vercel automatically.
 * 3. `FALLBACK_SITE_URL` in production, `http://localhost:3000` in development.
 *
 * A localhost value is ignored in production, so a misconfigured environment
 * can never publish localhost canonical tags.
 */
export function resolveSiteUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const isProduction = env.NODE_ENV === "production";

  const configured = normalizeUrl(env.NEXT_PUBLIC_SITE_URL);
  if (configured && !(isProduction && isLocalHost(configured))) {
    return configured;
  }

  const fromVercel = vercelProductionUrl(env);
  if (fromVercel && !isLocalHost(fromVercel)) {
    return fromVercel;
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
