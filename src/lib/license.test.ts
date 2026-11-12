import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LICENSE_STORAGE_KEY,
  type StoredLicense,
  activateLicense,
  isProUnlocked,
  isValidLicenseKeyFormat,
  normalizeLicenseKey,
  parseStoredLicense,
  validateLicense,
} from "./license";

const stored: StoredLicense = {
  licenseKey: "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
  instanceId: "instance-1",
  activatedAt: "2026-11-12T00:00:00.000Z",
};

describe("normalizeLicenseKey", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeLicenseKey("  abc-123 \n")).toBe("abc-123");
  });
});

describe("isValidLicenseKeyFormat", () => {
  it("accepts a UUID-style key", () => {
    expect(isValidLicenseKeyFormat("a1b2c3d4-e5f6-7890-abcd-ef0123456789")).toBe(true);
  });

  it("accepts a short alphanumeric key", () => {
    expect(isValidLicenseKeyFormat("abcd1234")).toBe(true);
  });

  it("rejects empty and whitespace-only input", () => {
    expect(isValidLicenseKeyFormat("")).toBe(false);
    expect(isValidLicenseKeyFormat("   ")).toBe(false);
  });

  it("rejects keys with symbols", () => {
    expect(isValidLicenseKeyFormat("key with spaces")).toBe(false);
    expect(isValidLicenseKeyFormat("key_with_underscore")).toBe(false);
  });

  it("rejects over-long input", () => {
    expect(isValidLicenseKeyFormat("a".repeat(65))).toBe(false);
  });
});

describe("parseStoredLicense", () => {
  it("parses a stored license", () => {
    expect(parseStoredLicense(JSON.stringify(stored))).toEqual(stored);
  });

  it("returns null for null input", () => {
    expect(parseStoredLicense(null)).toBeNull();
  });

  it("returns null for corrupt JSON", () => {
    expect(parseStoredLicense("{not json")).toBeNull();
  });

  it("returns null when fields are missing", () => {
    expect(parseStoredLicense(JSON.stringify({ licenseKey: "x" }))).toBeNull();
    expect(
      parseStoredLicense(JSON.stringify({ ...stored, instanceId: 42 })),
    ).toBeNull();
  });
});

describe("isProUnlocked / activateLicense against localStorage", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    store.clear();
    vi.restoreAllMocks();
  });

  it("is false when nothing is stored", () => {
    expect(isProUnlocked()).toBe(false);
  });

  it("unlocks after a successful activation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          activated: true,
          instance: { id: "instance-9" },
        }),
      ),
    );

    const result = await activateLicense("a1b2c3d4-e5f6-7890-abcd-ef0123456789");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.license.instanceId).toBe("instance-9");

    expect(isProUnlocked()).toBe(true);
  });

  it("does not consume a second activation for the same stored key", async () => {
    store.set(LICENSE_STORAGE_KEY, JSON.stringify(stored));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await activateLicense(stored.licenseKey);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.license.instanceId).toBe("instance-1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed key without calling the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await activateLicense("not a key");
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("translates license_key_not_found into plain English", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ valid: false, error: "license_key_not_found" })),
    );

    const result = await validateLicense(stored.licenseKey);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("does not match any purchase");
  });
});
