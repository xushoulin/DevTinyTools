/**
 * Google Analytics 4 configuration.
 *
 * Deliberately mirrors `ads.ts`: one constant decides whether any analytics
 * code is emitted, and the privacy policy reads the same constant. The policy
 * therefore cannot describe analytics the HTML does not load, nor stay silent
 * about analytics the HTML does load.
 *
 * To enable analytics, pick either route:
 *
 * 1. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` in `.env.local` or in the Vercel
 *    project settings. Public env vars are inlined at build time, so this needs
 *    a rebuild.
 * 2. Paste the id into `GA_MEASUREMENT_ID_FALLBACK` below and push — Vercel
 *    redeploys on push, so no dashboard access is needed.
 *
 * With neither set, nothing is emitted: no gtag.js request, no cookie, and the
 * privacy policy keeps its "no analytics" wording.
 */

/** GA4 web-stream id, always of the shape `G-XXXXXXXXXX`. */
const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,20}$/;

/**
 * Paste the id from analytics.google.com → Admin → Data streams → the web
 * stream → "Measurement ID" (top right). Left null on purpose: an invalid id
 * would emit a script that 404s and pollutes the console.
 */
export const GA_MEASUREMENT_ID_FALLBACK: string | null = null;

/**
 * Accepts only a real GA4 measurement id. Trims whitespace and uppercases, so
 * a value pasted from chat with a trailing newline or in lower case still
 * works; anything else (a UA- id, a full-width colon, an empty string) is
 * rejected instead of being rendered into a broken script URL.
 */
export function normalizeMeasurementId(
  value: string | null | undefined,
): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  return MEASUREMENT_ID_PATTERN.test(upper) ? upper : null;
}

/** Resolve the measurement id from the env var, then from the code fallback. */
export function getMeasurementId(): string | null {
  return (
    normalizeMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) ??
    normalizeMeasurementId(GA_MEASUREMENT_ID_FALLBACK)
  );
}

export const GA_MEASUREMENT_ID = getMeasurementId();

/** True once a valid measurement id exists, i.e. the tag should be emitted. */
export const ANALYTICS_ENABLED = GA_MEASUREMENT_ID !== null;

/**
 * Regions where Google requires prior consent before analytics cookies may be
 * stored: the EEA (EU 27 + Iceland, Liechtenstein, Norway) plus the UK and
 * Switzerland, which Google treats the same way.
 *
 * Outside this list — the site's main audience — analytics runs without a
 * prompt. Inside it, Consent Mode defaults analytics storage to "denied", so
 * gtag sends cookieless pings and stores nothing on the device until consent
 * is granted by a consent tool.
 */
export const CONSENT_REQUIRED_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO",
  "GB", "CH",
] as const;

/**
 * The inline bootstrap that must run before gtag.js processes anything.
 *
 * Consent Mode v2 defaults are pushed first, region-scoped, then a global
 * "granted" default covers everyone else. `allow_google_signals` and
 * `allow_ad_personalization_signals` stay off: advertising personalisation is
 * AdSense's business, and this tag should not widen it.
 */
export function gaBootstrapScript(measurementId: string): string {
  const denied = JSON.stringify(CONSENT_REQUIRED_REGIONS);

  return [
    "window.dataLayer=window.dataLayer||[];",
    "function gtag(){window.dataLayer.push(arguments);}",
    "gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',region:" +
      denied +
      "});",
    "gtag('consent','default',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});",
    "gtag('js',new Date());",
    "gtag('config'," +
      JSON.stringify(measurementId) +
      ",{anonymize_ip:true,allow_google_signals:false,allow_ad_personalization_signals:false});",
  ].join("");
}

/** URL of the gtag.js loader for a measurement id. */
export function gtagScriptUrl(measurementId: string): string {
  return `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    measurementId,
  )}`;
}
