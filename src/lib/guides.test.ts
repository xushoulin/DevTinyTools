import { describe, expect, it } from "vitest";
import {
  GUIDES,
  formatGuideDate,
  getGuide,
  otherGuides,
} from "./guides";
import { TOOLS } from "./tools";

describe("GUIDES registry", () => {
  it("has at least one guide", () => {
    expect(GUIDES.length).toBeGreaterThan(0);
  });

  it("derives every href from its slug", () => {
    for (const guide of GUIDES) {
      expect(guide.href).toBe(`/guides/${guide.slug}`);
    }
  });

  it("keeps slugs and hrefs unique", () => {
    const slugs = GUIDES.map((guide) => guide.slug);
    const hrefs = GUIDES.map((guide) => guide.href);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("uses URL-safe slugs", () => {
    for (const guide of GUIDES) {
      expect(guide.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("keeps meta descriptions inside the snippet limit", () => {
    for (const guide of GUIDES) {
      expect(guide.description.length).toBeLessThanOrEqual(160);
      expect(guide.description.length).toBeGreaterThan(50);
    }
  });

  it("has a summary and lede for every guide", () => {
    for (const guide of GUIDES) {
      expect(guide.summary.trim().length).toBeGreaterThan(40);
      expect(guide.lede.trim().length).toBeGreaterThan(80);
    }
  });

  it("points every guide at a tool that actually exists", () => {
    const toolHrefs = new Set(TOOLS.map((tool) => tool.href));

    for (const guide of GUIDES) {
      expect(toolHrefs.has(guide.relatedTool.href)).toBe(true);
    }
  });

  it("stores publication dates as plain ISO days", () => {
    for (const guide of GUIDES) {
      expect(guide.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(guide.publishedAt))).toBe(false);
      if (guide.updatedAt) {
        expect(guide.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("quotes a plausible reading time", () => {
    for (const guide of GUIDES) {
      expect(guide.readingMinutes).toBeGreaterThanOrEqual(3);
      expect(guide.readingMinutes).toBeLessThanOrEqual(30);
    }
  });
});

describe("getGuide", () => {
  it("finds a guide by slug", () => {
    const first = GUIDES[0];
    expect(getGuide(first.slug)?.href).toBe(first.href);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getGuide("does-not-exist")).toBeUndefined();
  });
});

describe("otherGuides", () => {
  it("excludes the current guide", () => {
    const first = GUIDES[0];
    const rest = otherGuides(first.slug);

    expect(rest).toHaveLength(GUIDES.length - 1);
    expect(rest.some((guide) => guide.slug === first.slug)).toBe(false);
  });
});

describe("formatGuideDate", () => {
  it("renders an ISO day as a readable date", () => {
    expect(formatGuideDate("2026-10-22")).toBe("October 22, 2026");
    expect(formatGuideDate("2026-01-01")).toBe("January 1, 2026");
    expect(formatGuideDate("2025-12-31")).toBe("December 31, 2025");
  });

  it("returns the input unchanged when it cannot be parsed", () => {
    expect(formatGuideDate("")).toBe("");
    expect(formatGuideDate("2026-13-01")).toBe("2026-13-01");
    expect(formatGuideDate("not-a-date")).toBe("not-a-date");
  });
});
