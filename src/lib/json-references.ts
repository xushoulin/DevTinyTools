/**
 * Measured reference data shared by the tool pages and the guides.
 *
 * Every row here was produced by running the input through the engine in this
 * project's Node build (V8) rather than copied from documentation, so the
 * guides and the tool pages can quote the same numbers without drifting.
 *
 * Changing a row changes both the tool page and the guide that cites it.
 */

/** Real `JSON.parse` failure messages, verbatim. */
export interface EngineMessage {
  /** Input that triggers the failure. */
  input: string;
  /** The message the engine returns, character for character. */
  message: string;
  /** What the message actually means. */
  note: string;
}

export const ENGINE_MESSAGES: EngineMessage[] = [
  {
    input: `{"a":1,}`,
    message: `Expected double-quoted property name in JSON at position 7 (line 1 column 8)`,
    note: "Trailing comma. After the comma the parser still expects another member.",
  },
  {
    input: `[1,2,]`,
    message: `Unexpected token ']', "[1,2,]" is not valid JSON`,
    note: "The same mistake in an array — and this time no position is reported at all.",
  },
  {
    input: `{a:1}`,
    message: `Expected property name or '}' in JSON at position 1 (line 1 column 2)`,
    note: "Unquoted key. A single-quoted key produces exactly the same message.",
  },
  {
    input: `{"a":1 // note}`,
    message: `Expected ',' or '}' after property value in JSON at position 7 (line 1 column 8)`,
    note: "The comment is seen as unexpected characters after a complete value.",
  },
  {
    input: `{"a":1`,
    message: `Expected ',' or '}' after property value in JSON at position 6 (line 1 column 7)`,
    note: "Reported at the last character, but the missing brace is the real problem.",
  },
  {
    input: `{"a":1}{"b":2}`,
    message: `Unexpected non-whitespace character after JSON at position 7 (line 1 column 8)`,
    note: "Two top-level values. A JSON document holds exactly one.",
  },
  {
    input: `{"a":NaN}`,
    message: `Unexpected token 'N', "{"a":NaN}" is not valid JSON`,
    note: "NaN is a JavaScript value, not a JSON one.",
  },
  {
    input: `\uFEFF{"a":1}`,
    message: `Unexpected token '\uFEFF', "\uFEFF{"a":1}" is not valid JSON`,
    note: "A UTF-8 BOM sits in front of the brace. The character between the single quotes is U+FEFF, which renders as nothing — that is why the message looks like it is complaining about a blank.",
  },
  {
    input: `undefined`,
    message: `"undefined" is not valid JSON`,
    note: "No “Unexpected token” prefix at all: V8 quotes the whole input instead. A variable that is still undefined reaches JSON.parse this way more often than a typo does.",
  },
];

/**
 * The same broken input run through three independent engines.
 *
 * `null` means the engine accepted the input instead of rejecting it — which is
 * itself a finding worth showing, because it means "is this valid JSON" has
 * more than one answer in practice.
 */
export interface CrossEngineCase {
  /** Input as the reader would paste it. */
  input: string;
  /** What the reader is trying to do, in plain words. */
  scenario: string;
  node: string | null;
  python: string | null;
  mysql: string | null;
}

export const CROSS_ENGINE_VERSIONS = {
  node: "Node 22.22.2 (V8)",
  python: "Python 3.13.12 (json)",
  mysql: "MySQL 8.4.3 (CAST … AS JSON)",
} as const;

export const CROSS_ENGINE_CASES: CrossEngineCase[] = [
  {
    input: "",
    scenario: "Empty response body",
    node: "Unexpected end of JSON input",
    python: "Expecting value: line 1 column 1 (char 0)",
    mysql: '"The document is empty." at position 0.',
  },
  {
    input: "<!DOCTYPE html>",
    scenario: "An HTML page arrived instead of JSON",
    node: `Unexpected token '<', "<!DOCTYPE html>" is not valid JSON`,
    python: "Expecting value: line 1 column 1 (char 0)",
    mysql: '"Invalid value." at position 0.',
  },
  {
    input: '{"a":1,}',
    scenario: "Trailing comma",
    node: "Expected double-quoted property name in JSON at position 7 (line 1 column 8)",
    python: "Illegal trailing comma before end of object: line 1 column 7 (char 6)",
    mysql: '"Missing a name for object member." at position 7.',
  },
  {
    input: '{"a":1}{"b":2}',
    scenario: "Two documents concatenated",
    node: "Unexpected non-whitespace character after JSON at position 7 (line 1 column 8)",
    python: "Extra data: line 1 column 8 (char 7)",
    mysql: '"The document root must not be followed by other values." at position 7.',
  },
  {
    input: "NaN",
    scenario: "A JavaScript literal that JSON does not have",
    node: '"NaN" is not valid JSON',
    python: null,
    mysql: '"Invalid value." at position 0.',
  },
];

/** What `JSON.parse` → `JSON.stringify` does to a document. */
export interface RoundTripCase {
  input: string;
  output: string;
  why: string;
}

export const ROUND_TRIP: RoundTripCase[] = [
  {
    input: '{"id":9007199254740993}',
    output: '{"id": 9007199254740992}',
    why: "Numbers become IEEE-754 doubles. Integers above 2^53 lose their last digits.",
  },
  {
    input: '{"b":1,"2":2,"1":3}',
    output: '{"1": 3, "2": 2, "b": 1}',
    why: "Keys that look like array indices are enumerated first, ascending. That is a JavaScript object rule, not a JSON one.",
  },
  {
    input: '{"a":1,"a":2}',
    output: '{"a": 2}',
    why: "Duplicate member names collapse silently: the last value wins and the others are gone.",
  },
  {
    input: '{"x":1.0,"y":1e3,"z":-0}',
    output: '{"x": 1, "y": 1000, "z": 0}',
    why: "Numbers are re-printed in their shortest round-trippable form.",
  },
  {
    input: '"\\u00e9\\/"',
    output: '"é/"',
    why: "Escapes are decoded, then only the ones that must be escaped are written back.",
  },
];

/** Raw vs compressed size of one real document. */
export interface SizeMeasurement {
  form: string;
  size: string;
  note: string;
}

export const SIZE_MEASUREMENTS: SizeMeasurement[] = [
  { form: "Indented, 2 spaces", size: "221,421 B", note: "216.2 KB — the baseline" },
  { form: "Minified", size: "124,588 B", note: "43.7% smaller than the indented file" },
  { form: "Indented, gzip -9", size: "10,879 B", note: "10.6 KB" },
  {
    form: "Minified, gzip -9",
    size: "9,700 B",
    note: "only 10.8% smaller than gzipping the indented file",
  },
  { form: "Indented, brotli", size: "5,038 B", note: "4.9 KB" },
  {
    form: "Minified, brotli",
    size: "4,791 B",
    note: "only 4.9% smaller than brotli-compressing the indented file",
  },
];

/** Where the numbers came from, quoted on the pages that show them. */
export const MEASUREMENT_PROVENANCE =
  "Measurements on this site come from running the inputs through this project's Node build (V8) and its bundled zlib, not from a vendor's documentation.";
