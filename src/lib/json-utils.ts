/**
 * Core JSON helpers.
 *
 * Everything in this module is pure and runs in the browser. No network
 * requests, no storage writes, no logging of user input.
 */

/** Refuse absurdly large inputs before they can freeze the tab. */
export const MAX_INPUT_CHARS = 2_000_000;

/** Safety valve for structure analysis of pathological documents. */
const MAX_ANALYZED_NODES = 500_000;

export type IndentSize = 2 | 4;

export type JsonValueType =
  | "object"
  | "array"
  | "string"
  | "number"
  | "boolean"
  | "null";

export type JsonErrorKind = "empty" | "too-large" | "syntax";

export interface JsonErrorInfo {
  kind: JsonErrorKind;
  /** Short, human readable reason (browser-specific suffixes removed). */
  message: string;
  /** True when the browser parser reported a line/column pair itself. */
  reportedByParser: boolean;
  /** 1-based line number, when it could be determined. */
  line: number | null;
  /** 1-based column number, when it could be determined. */
  column: number | null;
  /** 0-based character offset as reported by the parser. */
  position: number | null;
  /** The offending source line, shortened for display. */
  sourceLine: string | null;
  /** Possible causes, phrased as suggestions rather than facts. */
  hints: string[];
}

export type ParseOutcome =
  | { ok: true; value: unknown }
  | { ok: false; error: JsonErrorInfo };

export type TransformOutcome =
  | { ok: true; output: string }
  | { ok: false; error: JsonErrorInfo };

export interface JsonStats {
  type: JsonValueType;
  /** Root counts as depth 1. */
  depth: number;
  nodes: number;
  keys: number;
  arrayItems: number;
  /** True if the walk stopped early because the document was enormous. */
  truncated: boolean;
}

export interface CompressionStats {
  before: number;
  after: number;
  saved: number;
  savedPercent: number;
}

/* -------------------------------------------------------------------------- */
/* Location helpers                                                            */
/* -------------------------------------------------------------------------- */

/** Convert a 0-based character offset into a 1-based line/column pair. */
export function offsetToLineColumn(
  text: string,
  offset: number,
): { line: number; column: number } {
  const limit = Math.max(0, Math.min(offset, text.length));
  let line = 1;
  let lineStart = 0;

  for (let i = 0; i < limit; i += 1) {
    if (text.charCodeAt(i) === 10 /* \n */) {
      line += 1;
      lineStart = i + 1;
    }
  }

  return { line, column: limit - lineStart + 1 };
}

/** Extract a single line of source text (1-based), trimmed for display. */
export function getSourceLine(text: string, line: number | null): string | null {
  if (line === null || line < 1) return null;

  const lines = text.split(/\r\n|\n|\r/);
  const raw = lines[line - 1];
  if (raw === undefined) return null;

  const maxLength = 160;
  const collapsed = raw.replace(/\t/g, "  ").trimEnd();
  if (collapsed.length <= maxLength) return collapsed;
  return `${collapsed.slice(0, maxLength)}…`;
}

/* -------------------------------------------------------------------------- */
/* Error description                                                           */
/* -------------------------------------------------------------------------- */

class ScanError {
  constructor(
    readonly position: number,
    readonly reason: string,
  ) {}
}

const MAX_SCAN_DEPTH = 1_000;

function isWhitespaceChar(char: string | undefined): boolean {
  return char === " " || char === "\t" || char === "\n" || char === "\r";
}

function isDigitChar(char: string | undefined): boolean {
  return char !== undefined && char >= "0" && char <= "9";
}

function isHexChar(char: string | undefined): boolean {
  return char !== undefined && /[0-9a-fA-F]/.test(char);
}

/**
 * Locate the first syntax error with a small strict JSON scanner.
 *
 * Some engine versions report only "Unexpected token '}' ... is not valid
 * JSON" with no offset at all. When that happens, scanning the text ourselves
 * is the only way to point at the problem area. This scanner is never used to
 * decide whether a document is valid — `JSON.parse` always makes that call — so
 * an edge case here can only cost precision, never correctness.
 */
export function locateJsonError(
  text: string,
): { position: number; reason: string } | null {
  const length = text.length;
  let index = 0;

  const fail = (position: number, reason: string): never => {
    throw new ScanError(Math.max(0, Math.min(position, length)), reason);
  };

  function skipWhitespace(): void {
    while (index < length && isWhitespaceChar(text[index])) index += 1;
  }

  function scanString(): void {
    index += 1; // opening quote
    while (index < length) {
      const char = text[index];

      if (char === '"') {
        index += 1;
        return;
      }

      if (char === "\\") {
        index += 1;
        const escape = text[index];
        if (escape === undefined) fail(index, "The string is not terminated.");
        if ('"\\/bfnrt'.includes(escape)) {
          index += 1;
          continue;
        }
        if (escape === "u") {
          for (let offset = 1; offset <= 4; offset += 1) {
            if (!isHexChar(text[index + offset])) {
              fail(index + offset, "Invalid \\u escape sequence.");
            }
          }
          index += 5;
          continue;
        }
        fail(index, `Invalid escape sequence \\${escape}.`);
      }

      if (char.charCodeAt(0) < 0x20) {
        fail(index, "Control characters must be escaped inside a string.");
      }

      index += 1;
    }

    fail(index, "The string is not terminated.");
  }

  function scanNumber(): void {
    if (text[index] === "-") index += 1;

    if (text[index] === "0") {
      index += 1;
    } else if (isDigitChar(text[index])) {
      while (isDigitChar(text[index])) index += 1;
    } else {
      fail(index, "A number must contain at least one digit.");
    }

    if (text[index] === ".") {
      index += 1;
      if (!isDigitChar(text[index])) fail(index, "A decimal point must be followed by a digit.");
      while (isDigitChar(text[index])) index += 1;
    }

    if (text[index] === "e" || text[index] === "E") {
      index += 1;
      if (text[index] === "+" || text[index] === "-") index += 1;
      if (!isDigitChar(text[index])) fail(index, "An exponent must contain a digit.");
      while (isDigitChar(text[index])) index += 1;
    }
  }

  function scanLiteral(word: string): void {
    if (text.startsWith(word, index)) {
      index += word.length;
      return;
    }
    fail(index, `Expected ${word}.`);
  }

  function scanValue(depth: number): void {
    if (depth > MAX_SCAN_DEPTH) fail(index, "Nesting is too deep to locate the error.");

    const char = text[index];

    if (char === "{") {
      scanObject(depth);
      return;
    }
    if (char === "[") {
      scanArray(depth);
      return;
    }
    if (char === '"') {
      scanString();
      return;
    }
    if (char === "t") {
      scanLiteral("true");
      return;
    }
    if (char === "f") {
      scanLiteral("false");
      return;
    }
    if (char === "n") {
      scanLiteral("null");
      return;
    }
    if (char === "-" || isDigitChar(char)) {
      scanNumber();
      return;
    }
    if (char === undefined) {
      fail(index, "The input ends where a value is expected.");
    }
    fail(index, `Unexpected character ${JSON.stringify(char)} where a value is expected.`);
  }

  function scanObject(depth: number): void {
    index += 1; // {
    skipWhitespace();

    if (text[index] === "}") {
      index += 1;
      return;
    }

    for (;;) {
      skipWhitespace();

      if (text[index] === undefined) fail(index, "The object is not closed.");
      if (text[index] !== '"') fail(index, "Expected a double-quoted property name.");

      scanString();
      skipWhitespace();

      if (text[index] !== ":") fail(index, 'Expected ":" after the property name.');
      index += 1;

      skipWhitespace();
      scanValue(depth + 1);
      skipWhitespace();

      if (text[index] === ",") {
        index += 1;
        skipWhitespace();
        if (text[index] === "}") fail(index, "Trailing comma before a closing brace.");
        continue;
      }

      if (text[index] === "}") {
        index += 1;
        return;
      }

      if (text[index] === undefined) fail(index, "The object is not closed.");
      fail(index, 'Expected "," or "}" after a property value.');
    }
  }

  function scanArray(depth: number): void {
    index += 1; // [
    skipWhitespace();

    if (text[index] === "]") {
      index += 1;
      return;
    }

    for (;;) {
      skipWhitespace();
      scanValue(depth + 1);
      skipWhitespace();

      if (text[index] === ",") {
        index += 1;
        skipWhitespace();
        if (text[index] === "]") fail(index, "Trailing comma before a closing bracket.");
        continue;
      }

      if (text[index] === "]") {
        index += 1;
        return;
      }

      if (text[index] === undefined) fail(index, "The array is not closed.");
      fail(index, 'Expected "," or "]" after an array item.');
    }
  }

  try {
    skipWhitespace();
    scanValue(0);
    skipWhitespace();

    if (index < length) {
      fail(index, "Extra content after the top-level value.");
    }

    return null;
  } catch (error) {
    if (error instanceof ScanError) {
      return { position: error.position, reason: error.reason };
    }
    return null;
  }
}

function emptyInputError(): JsonErrorInfo {
  return {
    kind: "empty",
    message: "The input is empty. Paste JSON or load the example to get started.",
    reportedByParser: false,
    line: null,
    column: null,
    position: null,
    sourceLine: null,
    hints: [],
  };
}

function tooLargeError(length: number): JsonErrorInfo {
  return {
    kind: "too-large",
    message: `This input is ${formatCount(
      length,
    )} characters, which is over the ${formatCount(
      MAX_INPUT_CHARS,
    )} character limit. Split the document into smaller parts and try again.`,
    reportedByParser: false,
    line: null,
    column: null,
    position: null,
    sourceLine: null,
    hints: [
      "Formatting happens in this browser tab, so very large files are capped to keep the page responsive.",
    ],
  };
}

/** Strip engine-specific noise so the message reads as a plain sentence. */
export function cleanParserMessage(raw: string): string {
  const cleaned = raw
    .replace(/\s*in JSON at position \d+(?:\s*\(line \d+ column \d+\))?/i, "")
    .replace(/\s*\(line \d+ column \d+\)/i, "")
    .replace(/,?\s*\.{3}[\s\S]*?is not valid JSON/i, "")
    .trim();

  return cleaned || "The input is not valid JSON.";
}

/**
 * Remove the contents of double-quoted strings so structural heuristics do not
 * fire on text that merely looks like syntax (URLs, "key: value" prose, etc.).
 * Quote tokens themselves are kept as `""` so adjacent punctuation survives.
 */
export function stripStringLiterals(text: string): string {
  let out = "";
  let insideString = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (insideString) {
      if (char === "\\") {
        i += 1;
        continue;
      }
      if (char === '"') {
        insideString = false;
        out += '""';
      }
      continue;
    }

    if (char === '"') {
      insideString = true;
      continue;
    }

    out += char;
  }

  return out;
}

function detectHints(
  text: string,
  position: number | null,
  rawMessage: string,
  lineText: string | null,
): string[] {
  const hints: string[] = [];
  const elsewhere = stripStringLiterals(text.trim());

  if (text.charCodeAt(0) === 0xfeff) {
    hints.push(
      "The text starts with a byte order mark (BOM). Re-save the file as UTF-8 without BOM, or delete the invisible character at the start.",
    );
  }

  if (/[\u2018\u2019\u201c\u201d]/.test(elsewhere)) {
    hints.push(
      "The document contains smart quotes (“ ” ‘ ’) outside of a string. JSON only accepts straight double quotes (\").",
    );
  }

  // A comma directly before the reported offset is the classic trailing comma.
  if (position !== null && position > 0) {
    let index = position - 1;
    while (index >= 0 && /\s/.test(text[index])) index -= 1;
    if (text[index] === ",") {
      hints.push(
        "There is a trailing comma before a closing bracket. JSON does not allow a comma after the last item in an object or array.",
      );
    }
  }

  if (/(^|[{,[])\s*\/\/|\/\*/.test(elsewhere)) {
    hints.push(
      "Comments (// or /* */) are not part of the JSON specification. Remove them before validating.",
    );
  }

  if (/([{,]\s*[A-Za-z_$][\w$]*\s*:|^\s*[A-Za-z_$][\w$]*\s*:)/.test(elsewhere)) {
    hints.push(
      "A property name is not wrapped in double quotes. Every key must be a quoted string, for example \"id\": 1.",
    );
  }

  if (/([{,[]\s*'|:\s*'|'\s*:)/.test(elsewhere)) {
    hints.push(
      "Single quotes appear where double quotes are required. JSON strings must use \" double quotes.",
    );
  }

  if (/\b(NaN|Infinity|undefined)\b/.test(elsewhere)) {
    hints.push(
      "NaN, Infinity and undefined are not valid JSON values. Use null or a number instead.",
    );
  }

  if (/after JSON/i.test(rawMessage)) {
    hints.push(
      "There is extra content after the closing bracket. A JSON document must contain exactly one top-level value.",
    );
  }

  if (/end of (JSON|input|data)/i.test(rawMessage)) {
    hints.push(
      "The input ends in the middle of a value. Check for a missing closing quote, bracket or brace.",
    );
  }

  if (
    hints.length === 0 &&
    /expected ','|unexpected token|expected double-quoted/i.test(rawMessage)
  ) {
    hints.push(
      "Check the surrounding line for a missing comma between members, or a stray character inside a string.",
    );
  }

  if (hints.length === 0 && lineText === null && position !== null) {
    hints.push(
      "Check that every opening brace, bracket and quote has a matching closing one.",
    );
  }

  return hints.slice(0, 3);
}

/** Build a display-ready description of a JSON.parse failure. */
export function describeParseError(text: string, error: unknown): JsonErrorInfo {
  const raw = error instanceof Error ? error.message : String(error);

  const lineColumnMatch = raw.match(/line (\d+) column (\d+)/i);
  const positionMatch = raw.match(/position (\d+)/i);

  let position: number | null = positionMatch ? Number(positionMatch[1]) : null;
  let line: number | null = null;
  let column: number | null = null;
  const reportedByParser = Boolean(lineColumnMatch);

  if (lineColumnMatch) {
    line = Number(lineColumnMatch[1]);
    column = Number(lineColumnMatch[2]);
  }

  if (position !== null && (!Number.isFinite(position) || position < 0)) {
    position = null;
  }

  // Fall back to our own scan when the engine did not report a location, which
  // is the case for newer V8 messages such as `Unexpected token '}'`.
  let scanReason: string | null = null;
  if (line === null) {
    const located = locateJsonError(text);
    if (located) {
      scanReason = located.reason;
      const resolved = position ?? located.position;
      position = resolved;
      const derived = offsetToLineColumn(text, resolved);
      line = derived.line;
      column = derived.column;
    }
  } else if (position === null && column !== null) {
    position = offsetFromLineColumn(text, line, column);
  }

  const sourceLine = getSourceLine(text, line);
  const hints = detectHints(text, position, raw, sourceLine);

  if (hints.length === 0 && scanReason) {
    hints.push(scanReason);
  }

  return {
    kind: "syntax",
    message: cleanParserMessage(raw),
    reportedByParser,
    line,
    column,
    position,
    sourceLine,
    hints,
  };
}

/** Inverse of {@link offsetToLineColumn}; returns null if the line is missing. */
export function offsetFromLineColumn(
  text: string,
  line: number,
  column: number,
): number | null {
  if (line < 1 || column < 1) return null;

  let currentLine = 1;
  let index = 0;

  while (currentLine < line && index < text.length) {
    const char = text[index];
    if (char === "\n") {
      currentLine += 1;
    } else if (char === "\r") {
      currentLine += 1;
      if (text[index + 1] === "\n") index += 1;
    }
    index += 1;
  }

  if (currentLine !== line) return null;

  let column_ = 1;
  let offset = index;
  while (
    column_ < column &&
    offset < text.length &&
    text[offset] !== "\n" &&
    text[offset] !== "\r"
  ) {
    offset += 1;
    column_ += 1;
  }

  return offset;
}

/* -------------------------------------------------------------------------- */
/* Parse / transform                                                           */
/* -------------------------------------------------------------------------- */

export function parseJson(text: string): ParseOutcome {
  if (!text.trim()) {
    return { ok: false, error: emptyInputError() };
  }

  if (text.length > MAX_INPUT_CHARS) {
    return { ok: false, error: tooLargeError(text.length) };
  }

  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (error) {
    return { ok: false, error: describeParseError(text, error) };
  }
}

export function formatJson(text: string, indent: IndentSize = 2): TransformOutcome {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;

  try {
    const output = JSON.stringify(parsed.value, null, indent);
    if (typeof output !== "string") {
      return {
        ok: false,
        error: {
          kind: "syntax",
          message: "This value cannot be formatted as JSON.",
          reportedByParser: false,
          line: null,
          column: null,
          position: null,
          sourceLine: null,
          hints: [],
        },
      };
    }
    return { ok: true, output };
  } catch (error) {
    return { ok: false, error: describeParseError(text, error) };
  }
}

export function minifyJson(text: string): TransformOutcome {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;

  try {
    const output = JSON.stringify(parsed.value);
    if (typeof output !== "string") {
      return {
        ok: false,
        error: {
          kind: "syntax",
          message: "This value cannot be minified as JSON.",
          reportedByParser: false,
          line: null,
          column: null,
          position: null,
          sourceLine: null,
          hints: [],
        },
      };
    }
    return { ok: true, output };
  } catch (error) {
    return { ok: false, error: describeParseError(text, error) };
  }
}

/* -------------------------------------------------------------------------- */
/* Analysis / formatting helpers                                               */
/* -------------------------------------------------------------------------- */

export function getJsonType(value: unknown): JsonValueType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  switch (typeof value) {
    case "object":
      return "object";
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    default:
      return "null";
  }
}

/**
 * Walk the parsed document once to describe its shape. Uses an explicit stack
 * so deeply nested or very large documents cannot blow the call stack.
 */
export function analyzeJson(value: unknown): JsonStats {
  const rootType = getJsonType(value);
  const stack: Array<{ value: unknown; depth: number }> = [
    { value, depth: 1 },
  ];

  let nodes = 0;
  let keys = 0;
  let arrayItems = 0;
  let depth = 1;
  let truncated = false;

  while (stack.length > 0) {
    const current = stack.pop() as { value: unknown; depth: number };
    nodes += 1;

    if (nodes > MAX_ANALYZED_NODES) {
      truncated = true;
      break;
    }

    if (current.depth > depth) depth = current.depth;
    const childDepth = current.depth + 1;

    if (Array.isArray(current.value)) {
      arrayItems += current.value.length;
      for (const item of current.value) {
        stack.push({ value: item, depth: childDepth });
      }
    } else if (current.value !== null && typeof current.value === "object") {
      const entries = Object.entries(current.value as Record<string, unknown>);
      keys += entries.length;
      for (const [, child] of entries) {
        stack.push({ value: child, depth: childDepth });
      }
    }
  }

  return { type: rootType, depth, nodes, keys, arrayItems, truncated };
}

/** UTF-8 byte length, matching what an upload or network transfer would cost. */
export function utf8ByteLength(text: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(text).length;
  }

  let bytes = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      i += 1;
    } else bytes += 3;
  }
  return bytes;
}

/** Deterministic thousands separator (avoids locale-driven hydration drift). */
export function formatCount(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function trimTrailingZeros(value: string): string {
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    const digits = kb < 10 ? 2 : kb < 100 ? 1 : 0;
    return `${trimTrailingZeros(kb.toFixed(digits))} KB`;
  }
  return `${trimTrailingZeros((bytes / (1024 * 1024)).toFixed(2))} MB`;
}

export function getCompressionStats(
  before: string,
  after: string,
): CompressionStats {
  const beforeLength = before.length;
  const afterLength = after.length;
  const saved = Math.max(0, beforeLength - afterLength);
  const savedPercent =
    beforeLength === 0
      ? 0
      : Number(((saved / beforeLength) * 100).toFixed(1));

  return { before: beforeLength, after: afterLength, saved, savedPercent };
}

/** Shape check used by tests and the "compare semantics" assertion. */
export function isDeepStrictEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
