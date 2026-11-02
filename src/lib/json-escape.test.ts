import { describe, expect, it } from "vitest";

import {
  DEFAULT_ESCAPE_OPTIONS,
  escapeJsonString,
  unescapeJsonString,
  type EscapeOptions,
} from "./json-escape";

const withOptions = (overrides: Partial<EscapeOptions> = {}): EscapeOptions => ({
  ...DEFAULT_ESCAPE_OPTIONS,
  ...overrides,
});

describe("escapeJsonString", () => {
  it("matches JSON.stringify for the characters JSON.parse accepts", () => {
    const samples = [
      "",
      "plain ascii",
      'quote " and backslash \\',
      "line\nbreak\ttab\rcarriage",
      "bell \b and formfeed \f",
      "\u0000\u0001\u001f",
      "\u007f",
      "café ☕ 用户",
      "😀 astral",
      "/slashes/kept",
      "mixed \"q\" \\ and \n newline",
    ];

    for (const sample of samples) {
      expect(escapeJsonString(sample, DEFAULT_ESCAPE_OPTIONS)).toBe(
        JSON.stringify(sample),
      );
    }
  });

  it("escapes non-ASCII as upper-case-free four digit units when asked", () => {
    expect(escapeJsonString("é", withOptions({ escapeNonAscii: true }))).toBe(
      '"\\u00e9"',
    );
    // An astral character becomes a surrogate pair, matching Python's
    // ensure_ascii=True output.
    expect(escapeJsonString("😀", withOptions({ escapeNonAscii: true }))).toBe(
      '"\\ud83d\\ude00"',
    );
    expect(escapeJsonString("\u007f", withOptions({ escapeNonAscii: true }))).toBe(
      '"\\u007f"',
    );
  });

  it("leaves ASCII and slash alone unless the option is on", () => {
    expect(escapeJsonString("a/b", withOptions())).toBe('"a/b"');
    expect(escapeJsonString("a/b", withOptions({ escapeSlash: true }))).toBe('"a\\/b"');
  });

  it("omits the surrounding quotes when wrapInQuotes is off", () => {
    expect(escapeJsonString('say "hi"', withOptions({ wrapInQuotes: false }))).toBe(
      'say \\"hi\\"',
    );
  });

  it("escapes every C0 control character so the output stays legal JSON", () => {
    let raw = "";
    for (let code = 0; code < 0x20; code += 1) raw += String.fromCharCode(code);

    const escaped = escapeJsonString(raw, withOptions());

    expect(escaped).not.toMatch(/[\u0000-\u001f]/);
    expect(JSON.parse(escaped)).toBe(raw);
  });
});

describe("unescapeJsonString", () => {
  it("uses the browser parser when the input is valid", () => {
    const result = unescapeJsonString('"line\\nbreak \\u00e9"');

    expect(result.strict).toBe(true);
    expect(result.hadQuotes).toBe(true);
    expect(result.notes).toEqual([]);
    expect(result.value).toBe("line\nbreak é");
  });

  it("accepts a body without surrounding quotes", () => {
    const result = unescapeJsonString('line\\nbreak');

    expect(result.strict).toBe(true);
    expect(result.hadQuotes).toBe(false);
    expect(result.value).toBe("line\nbreak");
  });

  it("round-trips through the encoder", () => {
    const samples = ['"quoted" \\ path', "tab\there", "café ☕ 😀", "\u0000\u001f"];

    for (const sample of samples) {
      const escaped = escapeJsonString(sample, DEFAULT_ESCAPE_OPTIONS);
      expect(unescapeJsonString(escaped).value).toBe(sample);
    }
  });

  it("repairs \\xNN and says so instead of failing", () => {
    const result = unescapeJsonString('"\\x41\\x42"');

    expect(result.strict).toBe(false);
    expect(result.value).toBe("AB");
    // Distinct sequences stay distinct, because the point is to show exactly
    // which sequence in the input caused the problem.
    expect(result.notes).toEqual([
      { sequence: "\\x41", replacement: "A", count: 1 },
      { sequence: "\\x42", replacement: "B", count: 1 },
    ]);
    // The same sequence twice collapses into one entry with a count.
    const repeated = unescapeJsonString('"\\x41\\x41"');
    expect(repeated.notes).toEqual([{ sequence: "\\x41", replacement: "A", count: 2 }]);
  });

  it("drops the backslash on sequences JSON does not define", () => {
    const result = unescapeJsonString('"a\\qb"');

    expect(result.strict).toBe(false);
    expect(result.value).toBe("aqb");
    expect(result.notes[0]).toMatchObject({ sequence: "\\q", replacement: "q" });
  });

  it("decodes the ES2015 \\u{...} form", () => {
    const result = unescapeJsonString('"\\u{1F600}"');

    expect(result.strict).toBe(false);
    expect(result.value).toBe("😀");
    expect(result.notes[0]).toMatchObject({ sequence: "\\u{1F600}", replacement: "😀" });
  });

  it("keeps a trailing backslash rather than deleting it", () => {
    const result = unescapeJsonString('"abc\\"');

    expect(result.value).toBe("abc\\");
    expect(result.notes[0]).toMatchObject({ sequence: "\\", replacement: "\\" });
  });

  it("reports the parser message so the strict failure is explainable", () => {
    const result = unescapeJsonString('"\\q"');

    expect(result.strictError).toBeTruthy();
    expect(result.strictError).toContain("Bad escaped character");
  });

  it("keeps lone surrogates that the browser parser accepts", () => {
    const result = unescapeJsonString('"\\ud800"');

    expect(result.strict).toBe(true);
    expect(result.value.length).toBe(1);
    expect(result.value.charCodeAt(0)).toBe(0xd800);
  });
});
