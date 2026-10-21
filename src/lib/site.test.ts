import { afterEach, describe, expect, it } from "vitest";
import {
  FALLBACK_SITE_URL,
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

  it("returns null when nothing is configured", () => {
    delete process.env.NEXT_PUBLIC_CONTACT_EMAIL;
    expect(getContactEmail()).toBeNull();
  });

  it("returns the configured address", () => {
    process.env.NEXT_PUBLIC_CONTACT_EMAIL = "hello@devtinytools.com";
    expect(getContactEmail()).toBe("hello@devtinytools.com");
  });

  it("tolerates a trailing newline from a pasted value", () => {
    process.env.NEXT_PUBLIC_CONTACT_EMAIL = "hello@devtinytools.com\n";
    expect(getContactEmail()).toBe("hello@devtinytools.com");
  });

  it("returns null instead of a broken mailto for a rejected value", () => {
    process.env.NEXT_PUBLIC_CONTACT_EMAIL = "hello@devtinytools.com：";
    expect(getContactEmail()).toBeNull();
  });
});

describe("resolveSiteUrl", () => {
  it("uses localhost in development when nothing is configured", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
  });

  it("never emits localhost in a production build", () => {
    expect(resolveSiteUrl({ NODE_ENV: "production" })).toBe(FALLBACK_SITE_URL);
    expect(
      resolveSiteUrl({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }),
    ).toBe(FALLBACK_SITE_URL);
  });

  it("reads the domain Vercel injects automatically", () => {
    expect(
      resolveSiteUrl({
        NODE_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "devtinytools.vercel.app",
      }),
    ).toBe("https://devtinytools.vercel.app");

    expect(
      resolveSiteUrl({
        NODE_ENV: "production",
        NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: "devtinytools.vercel.app",
      }),
    ).toBe("https://devtinytools.vercel.app");
  });

  it("prefers an explicit NEXT_PUBLIC_SITE_URL over the Vercel domain", () => {
    expect(
      resolveSiteUrl({
        NODE_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "https://devtinytools.com",
        VERCEL_PROJECT_PRODUCTION_URL: "devtinytools.vercel.app",
      }),
    ).toBe("https://devtinytools.com");
  });

  it("strips a trailing slash", () => {
    expect(
      resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://devtinytools.com/" }),
    ).toBe("https://devtinytools.com");
  });

  it("ignores values that are not usable URLs", () => {
    expect(
      resolveSiteUrl({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "not a url" }),
    ).toBe(FALLBACK_SITE_URL);
    expect(
      resolveSiteUrl({
        NODE_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "",
        VERCEL_PROJECT_PRODUCTION_URL: "",
      }),
    ).toBe(FALLBACK_SITE_URL);
  });
});
