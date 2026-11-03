import { describe, expect, it } from "vitest";
import {
  BYTES_CASES,
  DECODE_CASES,
  PYTHON_VERSIONS,
  TRAILING_COMMA_BY_VERSION,
} from "./python-decode";

describe("python decode table", () => {
  it("covers one case per row and no duplicates", () => {
    expect(DECODE_CASES.length).toBe(14);
    const inputs = DECODE_CASES.map((c) => c.input);
    expect(new Set(inputs).size).toBe(inputs.length);
  });

  it("explains every row in a sentence rather than naming it twice", () => {
    for (const row of DECODE_CASES) {
      expect(row.cause.length).toBeGreaterThan(40);
      expect(row.label.length).toBeGreaterThan(8);
    }
  });

  it("has exactly one accepted input and it is the NaN literal", () => {
    const accepted = DECODE_CASES.filter((c) => c.message === null);
    expect(accepted).toHaveLength(1);
    expect(accepted[0].input).toContain("NaN");
  });

  it("has exactly four inputs that collapse to the same position 0 message", () => {
    const collapsed = DECODE_CASES.filter(
      (c) => c.message === "Expecting value" && c.position === "line 1 column 1 (char 0)",
    );
    expect(collapsed).toHaveLength(4);
  });

  it("quotes the V8 column verbatim", () => {
    for (const row of DECODE_CASES) {
      if (row.v8 === null) {
        expect(() => JSON.parse(row.input)).not.toThrow();
        continue;
      }
      let actual: string | null = null;
      try {
        JSON.parse(row.input);
      } catch (error) {
        actual = (error as Error).message;
      }
      expect(actual).toBe(row.v8);
    }
  });

  it("names four interpreters in release order", () => {
    expect(PYTHON_VERSIONS).toHaveLength(4);
    expect([...PYTHON_VERSIONS]).toEqual(["3.9.6", "3.10.8", "3.12.14", "3.13.12"]);
  });

  it("shows the trailing comma message changing exactly once", () => {
    expect(TRAILING_COMMA_BY_VERSION).toHaveLength(4);
    const [a, b, c, d] = TRAILING_COMMA_BY_VERSION;
    expect(a.message).toBe(b.message);
    expect(b.message).toBe(c.message);
    expect(d.message).not.toBe(c.message);
    expect(d.position).not.toBe(c.position);
  });

  it("pairs every bytes case with an outcome", () => {
    expect(BYTES_CASES).toHaveLength(4);
    for (const row of BYTES_CASES) {
      expect(row.detail.length).toBeGreaterThan(40);
      expect(["accepted", "rejected", "UnicodeDecodeError"]).toContain(row.outcome);
    }
  });

  it("contains no placeholder text", () => {
    const dump = JSON.stringify(DECODE_CASES);
    for (const bad of ["TODO", "FIXME", "lorem", "xxx"]) {
      expect(dump.toLowerCase()).not.toContain(bad.toLowerCase());
    }
  });
});
