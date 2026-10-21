import { describe, expect, it } from "vitest";
import {
  MAX_INPUT_CHARS,
  analyzeJson,
  describeParseError,
  formatBytes,
  formatCount,
  formatJson,
  getCompressionStats,
  getJsonType,
  isDeepStrictEqual,
  locateJsonError,
  minifyJson,
  offsetFromLineColumn,
  offsetToLineColumn,
  parseJson,
  stripStringLiterals,
  utf8ByteLength,
} from "./json-utils";

const NESTED_SAMPLE = JSON.stringify({
  id: 1042,
  name: "Ada Lovelace",
  active: true,
  score: 12.5,
  tags: ["typescript", "react", { nested: true, deep: [1, [2, [3]]] }],
  profile: { location: "London", meta: null },
  unicode: "café — 中文 🚀",
  escaped: 'line one\nline "two"\ttabbed',
});

describe("formatJson", () => {
  it("formats a plain object with two-space indentation", () => {
    const result = formatJson('{"b":2,"a":1}', 2);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.output).toBe('{\n  "b": 2,\n  "a": 1\n}');
  });

  it("formats a top-level array", () => {
    const result = formatJson("[1,2,3]", 2);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.output).toBe("[\n  1,\n  2,\n  3\n]");
  });

  it("handles nested objects and arrays", () => {
    const input = '{"a":{"b":[{"c":[1,2,{"d":null}]}]}}';
    const result = formatJson(input, 2);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.output).toContain('"d": null');
    expect(result.output.split("\n").length).toBeGreaterThan(8);

    const parsed = parseJson(result.output);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(isDeepStrictEqual(parsed.value, JSON.parse(input))).toBe(true);
  });

  it("preserves data semantics for a realistic document", () => {
    const result = formatJson(NESTED_SAMPLE, 2);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const reparsed = parseJson(result.output);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) return;

    expect(isDeepStrictEqual(reparsed.value, JSON.parse(NESTED_SAMPLE))).toBe(true);
    expect(result.output).toContain("中文 🚀");
  });

  it("respects the four-space indent option", () => {
    const two = formatJson('{"a":{"b":1}}', 2);
    const four = formatJson('{"a":{"b":1}}', 4);

    expect(two.ok && four.ok).toBe(true);
    if (!two.ok || !four.ok) return;

    expect(two.output).toContain('\n  "a"');
    expect(four.output).toContain('\n    "a"');
    expect(four.output.length).toBeGreaterThan(two.output.length);
  });

  it("formats primitive documents", () => {
    const stringResult = formatJson('"hello"', 2);
    const numberResult = formatJson("42.5", 2);

    expect(stringResult.ok && stringResult.output).toBe('"hello"');
    expect(numberResult.ok && numberResult.output).toBe("42.5");
  });
});

describe("minifyJson", () => {
  it("removes whitespace and keeps the data intact", () => {
    const input = '{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}';
    const result = minifyJson(input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.output).not.toContain("\n");
    expect(result.output).toBe('{"a":1,"b":[1,2]}');

    const parsed = parseJson(result.output);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(isDeepStrictEqual(parsed.value, JSON.parse(input))).toBe(true);
  });

  it("keeps spaces inside strings", () => {
    const result = minifyJson('{ "note": "keep   these  spaces" }');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe('{"note":"keep   these  spaces"}');
  });

  it("leaves an already-minified document unchanged", () => {
    const input = '{"a":1}';
    const result = minifyJson(input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe(input);
    expect(getCompressionStats(input, result.output).saved).toBe(0);
  });
});

describe("parseJson error handling", () => {
  it("reports empty input distinctly", () => {
    const result = parseJson("   \n\t ");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("empty");
    expect(result.error.message).toMatch(/empty/i);
  });

  it("rejects oversized input before parsing", () => {
    const result = parseJson("a".repeat(MAX_INPUT_CHARS + 1));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("too-large");
  });

  it("returns a location for invalid JSON", () => {
    const result = parseJson('{\n  "a": 1,\n  "b": }\n');

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe("syntax");
    expect(result.error.message.length).toBeGreaterThan(0);
    expect(result.error.line).toBe(3);
    expect(result.error.column).not.toBeNull();
    expect(result.error.sourceLine).toContain('"b"');
  });

  it("counts lines correctly with CRLF line endings", () => {
    const result = parseJson('{\r\n  "a": 1,\r\n  "b": ,\r\n}');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.line).toBe(3);
  });

  it("suggests a trailing comma as a possible cause", () => {
    const text = '{\n  "a": 1,\n}';
    const result = parseJson(text);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.hints.join(" ")).toMatch(/trailing comma/i);
  });

  it("does not blame comments for a URL inside a string", () => {
    const text = '{"url": "https://example.com/a", "b": }';
    const result = parseJson(text);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.hints.join(" ")).not.toMatch(/Comments \(\/\//);
  });

  it("cleans parser-specific suffixes from the message", () => {
    const error = new SyntaxError(
      "Expected double-quoted property name in JSON at position 12 (line 2 column 1)",
    );
    const described = describeParseError('{\n  "a": 1,\n}', error);

    expect(described.message).not.toMatch(/at position/i);
    expect(described.reportedByParser).toBe(true);
    expect(described.line).toBe(2);
    expect(described.column).toBe(1);
  });
});

describe("location helpers", () => {
  it("converts offsets to line and column", () => {
    const text = "abc\ndefg\nhi";
    expect(offsetToLineColumn(text, 0)).toEqual({ line: 1, column: 1 });
    expect(offsetToLineColumn(text, 2)).toEqual({ line: 1, column: 3 });
    expect(offsetToLineColumn(text, 4)).toEqual({ line: 2, column: 1 });
    expect(offsetToLineColumn(text, 9)).toEqual({ line: 3, column: 1 });
  });

  it("round-trips offset and line/column conversions", () => {
    const text = "{\n  \"a\": 1,\n  \"b\": [2, 3]\n}";

    for (const offset of [0, 1, 2, 8, 12, 20, text.length - 1]) {
      const { line, column } = offsetToLineColumn(text, offset);
      expect(offsetFromLineColumn(text, line, column)).toBe(offset);
    }
  });

  it("returns null when the line does not exist", () => {
    expect(offsetFromLineColumn("a\nb", 9, 1)).toBeNull();
  });
});

describe("analyzeJson", () => {
  it("counts nodes, keys, items and depth", () => {
    const stats = analyzeJson({ a: 1, b: [1, 2, { c: 3 }] });

    expect(stats.type).toBe("object");
    expect(stats.nodes).toBe(7);
    expect(stats.keys).toBe(3);
    expect(stats.arrayItems).toBe(3);
    expect(stats.depth).toBe(4);
    expect(stats.truncated).toBe(false);
  });

  it("describes primitive and array roots", () => {
    expect(analyzeJson([1, 2, 3])).toMatchObject({ type: "array", depth: 2, arrayItems: 3 });
    expect(getJsonType(null)).toBe("null");
    expect(getJsonType("x")).toBe("string");
  });
});

describe("locateJsonError", () => {
  it("returns null for valid documents", () => {
    expect(locateJsonError('{"a":[1,2,{"b":null}]}')).toBeNull();
    expect(locateJsonError("-12.5e3")).toBeNull();
    expect(locateJsonError('"a \\"quoted\\" string"')).toBeNull();
  });

  it("finds a trailing comma inside an object", () => {
    const found = locateJsonError('{"a": 1,}');
    expect(found?.position).toBe(8);
    expect(found?.reason).toMatch(/trailing comma/i);
  });

  it("finds a missing closing bracket", () => {
    const found = locateJsonError("[1, 2");
    expect(found?.position).toBe(5);
    expect(found?.reason).toMatch(/array is not closed/i);
  });

  it("finds an invalid literal", () => {
    const found = locateJsonError('{"ok": tru}');
    expect(found?.position).toBe(7);
    expect(found?.reason).toMatch(/Expected true/i);
  });

  it("finds extra content after the top-level value", () => {
    const found = locateJsonError('{"a":1} {"b":2}');
    expect(found?.position).toBe(8);
    expect(found?.reason).toMatch(/extra content/i);
  });

  it("finds an unquoted key", () => {
    const found = locateJsonError("{a: 1}");
    expect(found?.position).toBe(1);
    expect(found?.reason).toMatch(/double-quoted property name/i);
  });
});

describe("formatting helpers", () => {
  it("groups digits deterministically", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(999)).toBe("999");
    expect(formatCount(1234567)).toBe("1,234,567");
  });

  it("measures UTF-8 bytes", () => {
    expect(utf8ByteLength("abc")).toBe(3);
    expect(utf8ByteLength("é")).toBe(2);
    expect(utf8ByteLength("中")).toBe(3);
    expect(utf8ByteLength("🚀")).toBe(4);
  });

  it("formats byte sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(1044)).toBe("1.02 KB");
    expect(formatBytes(1024 * 1024 * 1.5)).toBe("1.5 MB");
  });

  it("computes compression stats", () => {
    const stats = getCompressionStats("a".repeat(100), "a".repeat(60));

    expect(stats).toEqual({ before: 100, after: 60, saved: 40, savedPercent: 40 });
    expect(getCompressionStats("", "")).toEqual({
      before: 0,
      after: 0,
      saved: 0,
      savedPercent: 0,
    });
  });

  it("strips string literals without breaking structure", () => {
    expect(stripStringLiterals('{"a": "b:c, d"}')).toBe('{"": ""}');
    expect(stripStringLiterals('"escaped \\" quote"')).toBe('""');
  });
});
