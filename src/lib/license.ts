/**
 * License activation for DevTinyTools Pro.
 *
 * Purchases are fulfilled through Lemon Squeezy, which issues a license key
 * per order. Its license endpoints are public (no API secret involved) and
 * callable from the browser, so activation stays fully client-side and the
 * "no sign-up" principle holds: a Pro user is a license key in localStorage,
 * nothing more.
 *
 *   validate : POST {base}/validate   { license_key }
 *   activate : POST {base}/activate   { license_key, instance_name }
 *
 * The base URL is overridable for tests via NEXT_PUBLIC_LICENSE_API_BASE.
 */

import { useSyncExternalStore } from "react";

export interface StoredLicense {
  licenseKey: string;
  instanceId: string;
  activatedAt: string;
}

export type LicenseOutcome =
  | { ok: true; license: StoredLicense }
  | { ok: false; error: string };

export const LICENSE_STORAGE_KEY = "dtt.pro.license";

const LICENSE_API_BASE = (
  process.env.NEXT_PUBLIC_LICENSE_API_BASE ?? "https://api.lemonsqueezy.com/v1/licenses"
).replace(/\/$/, "");

const INSTANCE_NAME = "devtinytools-browser";

/** Trims surrounding whitespace; the API is tolerant, we are just tidy. */
export function normalizeLicenseKey(raw: string): string {
  return raw.trim();
}

/**
 * Cheap shape check before hitting the network. Lemon Squeezy keys are
 * 36-character UUID-style strings, but the check stays loose so a future
 * format change does not break activation.
 */
export function isValidLicenseKeyFormat(key: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9-]{7,63}$/.test(key);
}

/** Reads and parses the stored license; null when absent or corrupt. */
export function parseStoredLicense(raw: string | null): StoredLicense | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !isStoredLicenseShape(parsed)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isStoredLicenseShape(value: object): value is StoredLicense {
  const record = value as Record<string, unknown>;
  return (
    typeof record.licenseKey === "string" &&
    record.licenseKey.length > 0 &&
    typeof record.instanceId === "string" &&
    record.instanceId.length > 0 &&
    typeof record.activatedAt === "string"
  );
}

/** True in a browser tab with an activated license; false everywhere else. */
export function isProUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return (
    parseStoredLicense(window.localStorage.getItem(LICENSE_STORAGE_KEY)) !== null
  );
}

function subscribeToStorage(onChange: () => void): () => void {
  // Same-tab writes do not fire "storage" events; activation reloads the
  // page, so the subscription only needs to cover cross-tab changes.
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

const NOT_UNLOCKED = () => false;

/**
 * Hydration-safe Pro flag for client components: the server snapshot is
 * always false, the client snapshot reads localStorage after hydration.
 */
export function useProUnlocked(): boolean {
  return useSyncExternalStore(subscribeToStorage, isProUnlocked, NOT_UNLOCKED);
}

function readStoredLicense(): StoredLicense | null {
  if (typeof window === "undefined") return null;
  return parseStoredLicense(window.localStorage.getItem(LICENSE_STORAGE_KEY));
}

export function forgetStoredLicense(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LICENSE_STORAGE_KEY);
}

interface LsValidateResponse {
  valid?: boolean;
  error?: string;
  license_key?: { status?: string };
}

interface LsActivateResponse {
  activated?: boolean;
  error?: string;
  instance?: { id?: string };
}

/** Error copy for the common failure modes, phrased for a non-expert. */
function describeFailure(rawError?: string): string {
  switch (rawError) {
    case "license_key_not_found":
      return "That key does not match any purchase. Check it for typos and try again.";
    case "license_key_disabled":
      return "This key has been disabled. Contact support if you believe that is a mistake.";
    case "activation_limit_reached":
      return "This key has reached its activation limit. Deactivate it on another device first, or contact support.";
    default:
      return "The license service could not be reached or rejected the request. Check your connection and try again.";
  }
}

async function postLicenseApi<T>(
  path: string,
  body: Record<string, string>,
): Promise<{ ok: true; data: T } | { ok: false; error: string; rawError?: string }> {
  let response: Response;
  try {
    response = await fetch(`${LICENSE_API_BASE}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: describeFailure() };
  }

  if (!response.ok) {
    return { ok: false, error: describeFailure() };
  }

  try {
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, error: describeFailure() };
  }
}

/**
 * Validates a key against the license API. A first-time activation goes
 * through activateLicense; this is the lighter check used by the dialog to
 * show status for an already-activated machine.
 */
export async function validateLicense(key: string): Promise<LicenseOutcome> {
  const licenseKey = normalizeLicenseKey(key);
  if (!isValidLicenseKeyFormat(licenseKey)) {
    return { ok: false, error: "That does not look like a license key." };
  }

  const result = await postLicenseApi<LsValidateResponse>("validate", {
    license_key: licenseKey,
  });
  if (!result.ok) return { ok: false, error: result.error };
  if (!result.data.valid) {
    return { ok: false, error: describeFailure(result.data.error) };
  }

  const existing = readStoredLicense();
  if (existing && existing.licenseKey === licenseKey) {
    return { ok: true, license: existing };
  }

  return activateLicense(licenseKey);
}

/**
 * Activates a key with Lemon Squeezy (registers this browser as an instance)
 * and stores it. Idempotent: an already-stored key for the same browser is
 * returned as-is without consuming another activation seat.
 */
export async function activateLicense(key: string): Promise<LicenseOutcome> {
  const licenseKey = normalizeLicenseKey(key);
  if (!isValidLicenseKeyFormat(licenseKey)) {
    return { ok: false, error: "That does not look like a license key." };
  }

  const existing = readStoredLicense();
  if (existing && existing.licenseKey === licenseKey) {
    return { ok: true, license: existing };
  }

  const result = await postLicenseApi<LsActivateResponse>("activate", {
    license_key: licenseKey,
    instance_name: INSTANCE_NAME,
  });
  if (!result.ok) return { ok: false, error: result.error };
  if (!result.data.activated || !result.data.instance?.id) {
    return { ok: false, error: describeFailure(result.data.error) };
  }

  const license: StoredLicense = {
    licenseKey,
    instanceId: result.data.instance.id,
    activatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(license));
  }
  return { ok: true, license };
}
