import { afterEach, describe, expect, it } from "vitest";
import { getContactEmail, normalizeContactEmail } from "./site";

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
