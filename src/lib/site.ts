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
 * The production origin this site is published on.
 *
 * Kept in code rather than left to Vercel's injected
 * `VERCEL_PROJECT_PRODUCTION_URL`, because that variable resolves to the
 * *shortest* production domain. Once both `shoulin.shop` and `www.shoulin.shop`
 * are attached to the project it would pick the apex domain, while the site is
 * served on `www` — canonicals, Open Graph URLs and sitemap entries would then
 * disagree with the address Google actually crawls.
 *
 * Changing the domain means editing this line and pushing.
 */
export const PRODUCTION_SITE_URL = "https://www.shoulin.shop";

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
export const CONTACT_EMAIL_FALLBACK: string | null = "xushoulin1234@gmail.com";

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
 * preview deployments too. The value never includes the protocol, so it is
 * normalised here.
 *
 * Only used as a safety net when {@link PRODUCTION_SITE_URL} is set to null:
 * "shortest domain" prefers the apex over `www`, which is not always the host
 * the site is served on.
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
 * 1. `NEXT_PUBLIC_SITE_URL` — optional explicit override.
 * 2. `PRODUCTION_SITE_URL` — the domain pinned in code, used for any
 *    non-development build.
 * 3. `VERCEL_PROJECT_PRODUCTION_URL` — only reached if the pin is removed.
 * 4. `http://localhost:3000` in development.
 *
 * A localhost value is ignored in production, so a misconfigured environment
 * can never publish localhost canonical tags.
 */
export function resolveSiteUrl(
  env: Record<string, string | undefined> = process.env,
  pinned: string | null = PRODUCTION_SITE_URL,
): string {
  const isProduction = env.NODE_ENV === "production";

  const configured = normalizeUrl(env.NEXT_PUBLIC_SITE_URL);
  if (configured && !(isProduction && isLocalHost(configured))) {
    return configured;
  }

  if (!isProduction) return "http://localhost:3000";

  const pinnedUrl = normalizeUrl(pinned ?? undefined);
  if (pinnedUrl && !isLocalHost(pinnedUrl)) {
    return pinnedUrl;
  }

  const fromVercel = vercelProductionUrl(env);
  if (fromVercel && !isLocalHost(fromVercel)) {
    return fromVercel;
  }

  return PRODUCTION_SITE_URL;
}

export const SITE_URL = resolveSiteUrl();

/** Absolute URL helper for canonicals, Open Graph tags and the sitemap. */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${suffix === "/" ? "" : suffix}` || SITE_URL;
}

export const PRIVACY_LAST_UPDATED = "October 22, 2026";

/**
 * Public source repository.
 *
 * Linked from the footer and from /about so a reader can check the "nothing is
 * uploaded" claim instead of taking it on trust. The first question a
 * developer asks about a tool like this is "where is the code", and a reader
 * who cannot find the answer assumes the answer is bad.
 */
export const GITHUB_REPO_URL = "https://github.com/xushoulin/DevTinyTools";
