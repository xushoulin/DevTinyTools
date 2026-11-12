import { describe, expect, it } from "vitest";
import { diffJson } from "./json-diff";
import { buildDiffReport } from "./diff-report";

function diff(beforeText: string, afterText: string) {
  const before = JSON.parse(beforeText);
  const after = JSON.parse(afterText);
  return diffJson(before, after, { ignoreKeyOrder: true, ignoreArrayOrder: false });
}

describe("buildDiffReport", () => {
  it("opens with the header and a counts line", () => {
    const result = diff(`{"a":1}`, `{"a":2}`);

    const report = buildDiffReport(result);

    expect(report.startsWith("DevTinyTools JSON diff report\n")).toBe(true);
    expect(report).toContain("Differences: 1 (1 changed)");
  });

  it("lists each entry with a path and both values", () => {
    const result = diff(
      `{"cart":{"total":10},"keep":true}`,
      `{"cart":{"total":12},"keep":true}`,
    );

    const report = buildDiffReport(result);

    expect(report).toContain("[changed] $.cart.total");
    expect(report).toContain("- 10");
    expect(report).toContain("+ 12");
  });

  it("renders added and removed entries", () => {
    const result = diff(`{"a":1}`, `{"b":2}`);

    const report = buildDiffReport(result);

    expect(report).toContain("[removed] $.a");
    expect(report).toContain("[added] $.b");
  });

  it("renders a reordered entry with its detail", () => {
    const result = diffJson(
      { a: 1, b: 2 },
      { b: 2, a: 1 },
      { ignoreKeyOrder: false, ignoreArrayOrder: false },
    );

    const report = buildDiffReport(result);

    expect(report).toContain("[reordered]");
    expect(report).toContain("Differences:");
  });

  it("states equivalence for an empty diff", () => {
    const result = diff(`{"a":1}`, `{"a":1}`);

    const report = buildDiffReport(result);

    expect(report).toContain("Differences: 0");
    expect(report).toContain("equivalent");
  });

  it("appends a truncation note when entries were cut off", () => {
    const result = diff(`{"a":1}`, `{"a":2}`);
    const truncated = { ...result, truncated: true };

    const report = buildDiffReport(truncated);

    expect(report).toContain("cut off");
  });

  it("ends with exactly one trailing newline", () => {
    const report = buildDiffReport(diff(`{"a":1}`, `{"a":2}`));

    expect(report.endsWith("\n")).toBe(true);
    expect(report.endsWith("\n\n")).toBe(false);
  });
});
