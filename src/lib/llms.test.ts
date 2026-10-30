import { describe, expect, it } from "vitest";
import { LLMS_FACTS, buildLlmsTxt } from "./llms";
import { GUIDES } from "./guides";
import { TOOLS } from "./tools";
import { absoluteUrl } from "./site";

const txt = buildLlmsTxt();

describe("llms.txt", () => {
  it("opens with the required title and summary block", () => {
    expect(txt.startsWith("# DevTinyTools\n")).toBe(true);
    expect(txt).toContain("\n> ");
  });

  it("lists every tool with an absolute URL", () => {
    for (const tool of TOOLS) {
      expect(txt).toContain(absoluteUrl(tool.href));
    }
  });

  it("lists every guide, so a new guide cannot be omitted", () => {
    for (const guide of GUIDES) {
      expect(txt).toContain(absoluteUrl(guide.href));
    }
  });

  it("uses only absolute links, since the file is read outside the site", () => {
    const links = [...txt.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThan(TOOLS.length + GUIDES.length);
    for (const href of links) {
      expect(href.startsWith("https://") || href.startsWith("http://")).toBe(true);
    }
  });

  it("keeps the quotable facts short enough to be cited verbatim", () => {
    expect(LLMS_FACTS.length).toBeGreaterThanOrEqual(3);
    for (const fact of LLMS_FACTS) {
      expect(fact.length).toBeLessThanOrEqual(300);
      expect(fact.trim()).toBe(fact);
    }
  });

  it("does not exceed the size a context window will happily read", () => {
    expect(txt.length).toBeLessThan(8000);
  });
});
