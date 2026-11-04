import { describe, expect, it } from "vitest";
import { CORE_PAGE_DATES, TOOL_PAGE_DATES } from "./content-dates";
import { TOOLS } from "./tools";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("sitemap content dates", () => {
  it("has a date for every tool in the registry", () => {
    // A missing key would serialise as `Invalid Date` in the XML rather than
    // failing the build, so it is checked here instead.
    expect(Object.keys(TOOL_PAGE_DATES).sort()).toEqual(TOOLS.map((t) => t.href).sort());
  });

  it("keeps no date for a tool that no longer exists", () => {
    const known = new Set(TOOLS.map((t) => t.href));
    for (const href of Object.keys(TOOL_PAGE_DATES)) {
      expect(known.has(href)).toBe(true);
    }
  });

  it("lists the pages outside the sitemap registries", () => {
    expect(Object.keys(CORE_PAGE_DATES).sort()).toEqual(
      ["/", "/about", "/contact", "/guides", "/privacy-policy"].sort(),
    );
  });

  it("uses parseable calendar dates that are not in the future", () => {
    const all = [...Object.values(CORE_PAGE_DATES), ...Object.values(TOOL_PAGE_DATES)];
    const now = Date.now();
    for (const value of all) {
      expect(value).toMatch(ISO_DATE);
      const time = new Date(value).getTime();
      expect(Number.isNaN(time)).toBe(false);
      expect(time).toBeLessThanOrEqual(now);
    }
  });
});
