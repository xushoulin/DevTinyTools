import { afterEach, describe, expect, it } from "vitest";
import {
  ANALYTICS_ENABLED,
  CONSENT_REQUIRED_REGIONS,
  GA_MEASUREMENT_ID,
  GA_MEASUREMENT_ID_FALLBACK,
  gaBootstrapScript,
  getMeasurementId,
  gtagScriptUrl,
  normalizeMeasurementId,
} from "./analytics";

describe("normalizeMeasurementId", () => {
  it("keeps a well-formed GA4 id", () => {
    expect(normalizeMeasurementId("G-ABC123XYZ9")).toBe("G-ABC123XYZ9");
  });

  it("trims whitespace and uppercases", () => {
    expect(normalizeMeasurementId("  g-abc123xyz9\n")).toBe("G-ABC123XYZ9");
  });

  it("rejects empty and missing values", () => {
    expect(normalizeMeasurementId("")).toBeNull();
    expect(normalizeMeasurementId("   ")).toBeNull();
    expect(normalizeMeasurementId(undefined)).toBeNull();
    expect(normalizeMeasurementId(null)).toBeNull();
  });

  it("rejects a full-width colon pasted from a chat message", () => {
    expect(normalizeMeasurementId("NEXT_PUBLIC_GA_MEASUREMENT_ID：")).toBeNull();
    expect(normalizeMeasurementId("G-ABC123XYZ9：")).toBeNull();
  });

  it("rejects ids from the older Universal Analytics scheme", () => {
    expect(normalizeMeasurementId("UA-12345678-1")).toBeNull();
  });

  it("rejects a bare container id and a missing prefix", () => {
    expect(normalizeMeasurementId("GTM-ABC123")).toBeNull();
    expect(normalizeMeasurementId("ABC123XYZ9")).toBeNull();
  });

  it("rejects a full URL instead of an id", () => {
    expect(
      normalizeMeasurementId("https://www.googletagmanager.com/gtag/js?id=G-1"),
    ).toBeNull();
  });
});

describe("getMeasurementId", () => {
  const original = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    } else {
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = original;
    }
  });

  it("returns the code fallback when no env var is present", () => {
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    expect(getMeasurementId()).toBe(GA_MEASUREMENT_ID_FALLBACK);
  });

  it("returns the configured id", () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-ABC123XYZ9";
    expect(getMeasurementId()).toBe("G-ABC123XYZ9");
  });

  it("tolerates whitespace pasted with the value", () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = " G-abc123xyz9\n";
    expect(getMeasurementId()).toBe("G-ABC123XYZ9");
  });

  it("ignores a malformed env value instead of emitting a broken script", () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-ABC123XYZ9：";
    expect(getMeasurementId()).toBe(GA_MEASUREMENT_ID_FALLBACK);
  });
});

describe("gaBootstrapScript", () => {
  it("pushes a region-scoped denial before the global grant", () => {
    const script = gaBootstrapScript("G-ABC123XYZ9");
    const deniedAt = script.indexOf("'denied'");
    const grantedAt = script.indexOf("'granted'");

    expect(deniedAt).toBeGreaterThan(-1);
    expect(grantedAt).toBeGreaterThan(deniedAt);
  });

  it("scopes the denial to the EEA plus UK and Switzerland", () => {
    const script = gaBootstrapScript("G-ABC123XYZ9");

    for (const region of ['"DE"', '"FR"', '"GB"', '"CH"', '"NO"']) {
      expect(script).toContain(region);
    }
    // The main audience is outside the list, so it must not be denied.
    expect(script).not.toContain('"US"');
  });

  it("configures the given measurement id and keeps ad signals off", () => {
    const script = gaBootstrapScript("G-ABC123XYZ9");

    expect(script).toContain('gtag(\'config\',"G-ABC123XYZ9"');
    expect(script).toContain("allow_google_signals:false");
    expect(script).toContain("allow_ad_personalization_signals:false");
  });

  it("defines the dataLayer before any gtag call", () => {
    const script = gaBootstrapScript("G-ABC123XYZ9");
    expect(script.indexOf("window.dataLayer")).toBeLessThan(
      script.indexOf("gtag("),
    );
  });
});

describe("gtagScriptUrl", () => {
  it("points at gtag.js with the id as a query parameter", () => {
    expect(gtagScriptUrl("G-ABC123XYZ9")).toBe(
      "https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ9",
    );
  });

  it("encodes characters that would break the query string", () => {
    expect(gtagScriptUrl("G-AB&CD")).toBe(
      "https://www.googletagmanager.com/gtag/js?id=G-AB%26CD",
    );
  });
});

describe("CONSENT_REQUIRED_REGIONS", () => {
  it("covers all 27 EU member states plus Iceland, Liechtenstein and Norway", () => {
    const eu = [
      "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
      "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
      "PL", "PT", "RO", "SK", "SI", "ES", "SE",
    ];

    expect(eu).toHaveLength(27);
    for (const code of eu) {
      expect(CONSENT_REQUIRED_REGIONS).toContain(code);
    }
    expect(CONSENT_REQUIRED_REGIONS).toContain("IS");
    expect(CONSENT_REQUIRED_REGIONS).toContain("LI");
    expect(CONSENT_REQUIRED_REGIONS).toContain("NO");
  });

  it("has no duplicates", () => {
    expect(new Set(CONSENT_REQUIRED_REGIONS).size).toBe(
      CONSENT_REQUIRED_REGIONS.length,
    );
  });

  it("uses only ISO 3166-1 alpha-2 codes", () => {
    for (const code of CONSENT_REQUIRED_REGIONS) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });
});

describe("the analytics switch", () => {
  it("stays off exactly when no measurement id resolves", () => {
    expect(ANALYTICS_ENABLED).toBe(GA_MEASUREMENT_ID !== null);
  });

  it("only ships a code fallback that is itself a valid id", () => {
    if (GA_MEASUREMENT_ID_FALLBACK === null) {
      expect(normalizeMeasurementId(GA_MEASUREMENT_ID_FALLBACK)).toBeNull();
      return;
    }

    expect(normalizeMeasurementId(GA_MEASUREMENT_ID_FALLBACK)).toBe(
      GA_MEASUREMENT_ID_FALLBACK,
    );
  });
});
