import { afterEach, describe, expect, it } from "vitest";
import {
  CONTACT_EMAIL_FALLBACK,
  PRODUCTION_SITE_URL,
  getContactEmail,
  normalizeContactEmail,
  resolveSiteUrl,
} from "./site";

describe("normalizeContactEmail", () => {
  it("keeps a plain address", () => {
    expect(normalizeContactEmail("hello@devtinytools.com")).toBe(
      "hello@devtinytools.com",
    );
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeContactEmail("  hello@devtinytools.com\n")).toBe(
      "hello@devtinytools.com",
    );
  });

  it("rejects an address with a full-width colon pasted from chat", () => {
    expect(normalizeContactEmail("NEXT_PUBLIC_CONTACT_EMAIL：")).toBeNull();
    expect(normalizeContactEmail("hello@devtinytools.com：")).toBeNull();
  });

  it("rejects empty and whitespace-only values", () => {
    expect(normalizeContactEmail("")).toBeNull();
    expect(normalizeContactEmail("   ")).toBeNull();
    expect(normalizeContactEmail(undefined)).toBeNull();
    expect(normalizeContactEmail(null)).toBeNull();
  });

  it("rejects values that are not email addresses", () => {
    expect(normalizeContactEmail("hello")).toBeNull();
    expect(normalizeContactEmail("hello@")).toBeNull();
    expect(normalizeContactEmail("hello@localhost")).toBeNull();
  });
});

describe("getContactEmail", () => {
  const original = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_CONTACT_EMAIL;
    } else {
      process.env.NEXT_PUBLIC_CONTACT_EMAIL = original;
    }
  });

  it("returns the address set in code when no env var is present", () => {
    delete process.env.NEXT_PUBLIC_CONTACT_EMAIL;
    expect(getContactEmail()).toBe(CONTACT_EMAIL_FALLBACK);
    expect(CONTACT_EMAIL_FALLBACK).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it("returns the configured address", () => {
    process.env.NEXT_PUBLIC_CONTACT_EMAIL = "hello@devtinytools.com";
    expect(getContactEmail()).toBe("hello@devtinytools.com");
  });

  it("tolerates a trailing newline from a pasted value", () => {
    process.env.NEXT_PUBLIC_CONTACT_EMAIL = "hello@devtinytools.com\n";
    expect(getContactEmail()).toBe("hello@devtinytools.com");
  });

  it("ignores a malformed env value instead of emitting a broken mailto", () => {
    process.env.NEXT_PUBLIC_CONTACT_EMAIL = "hello@devtinytools.com：";
    expect(getContactEmail()).toBe(CONTACT_EMAIL_FALLBACK);
  });
});

describe("resolveSiteUrl", () => {
  it("uses localhost in development when nothing is configured", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
  });

  it("uses the pinned production domain for every production build", () => {
    expect(resolveSiteUrl({ NODE_ENV: "production" })).toBe(PRODUCTION_SITE_URL);
    expect(PRODUCTION_SITE_URL).toBe("https://www.shoulin.shop");
  });

  it("never emits localhost in a production build", () => {
    expect(
      resolveSiteUrl({
        NODE_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      }),
    ).toBe(PRODUCTION_SITE_URL);
  });

  it("keeps the pinned www host instead of Vercel's shortest domain", () => {
    // Vercel would inject the apex domain here; the pin has to win, otherwise
    // canonicals disagree with the host the site is actually served on.
    expect(
      resolveSiteUrl({
        NODE_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "shoulin.shop",
      }),
    ).toBe("https://www.shoulin.shop");
  });

  it("prefers an explicit NEXT_PUBLIC_SITE_URL over the pin", () => {
    expect(
      resolveSiteUrl({
        NODE_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "https://example.com",
        VERCEL_PROJECT_PRODUCTION_URL: "shoulin.shop",
      }),
    ).toBe("https://example.com");
  });

  it("falls back to Vercel's domain when no domain is pinned", () => {
    expect(
      resolveSiteUrl(
        {
          NODE_ENV: "production",
          VERCEL_PROJECT_PRODUCTION_URL: "shoulin.shop",
        },
        null,
      ),
    ).toBe("https://shoulin.shop");

    expect(
      resolveSiteUrl(
        {
          NODE_ENV: "production",
          NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: "shoulin.shop",
        },
        null,
      ),
    ).toBe("https://shoulin.shop");
  });

  it("strips a trailing slash", () => {
    expect(
      resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://shoulin.shop/" }),
    ).toBe("https://shoulin.shop");
  });

  it("ignores values that are not usable URLs", () => {
    expect(
      resolveSiteUrl({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "not a url" }),
    ).toBe(PRODUCTION_SITE_URL);
    expect(
      resolveSiteUrl({
        NODE_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "",
        VERCEL_PROJECT_PRODUCTION_URL: "",
      }),
    ).toBe(PRODUCTION_SITE_URL);
  });
});
