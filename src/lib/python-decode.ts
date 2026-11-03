/**
 * What `json.loads` actually says, measured rather than quoted.
 *
 * Every row below was produced by running the input through CPython, not copied
 * from a blog post. `scripts/measure-python-json.py` reproduces the table, and
 * the version column was produced by running that same script under four
 * interpreters side by side.
 */

/** Interpreters the version comparison was run on, in release order. */
export const PYTHON_VERSIONS = ["3.9.6", "3.10.8", "3.12.14", "3.13.12"] as const;

export interface DecodeCase {
  /** Short name for the mistake, used as the table's first column. */
  label: string;
  /** The exact document handed to `json.loads`. */
  input: string;
  /** How to render the input when it contains invisible characters. */
  display?: string;
  /** Why a person produces this input, in plain language. */
  cause: string;
  /** `JSONDecodeError.msg` on 3.13.12, or null when the input was accepted. */
  message: string | null;
  /** `line / column / char` triple as Python formats it, or empty. */
  position: string;
  /** `JSON.parse` on Node 22, for contrast, or null when V8 accepted it. */
  v8: string | null;
}

export const DECODE_CASES: DecodeCase[] = [
  {
    label: "Single quotes around a key",
    input: "{'a': 1}",
    cause:
      "The document was written by hand, or built with str() instead of json.dumps(), so Python's own quote style leaked into it.",
    message: "Expecting property name enclosed in double quotes",
    position: "line 1 column 2 (char 1)",
    v8: "Expected property name or '}' in JSON at position 1 (line 1 column 2)",
  },
  {
    label: "Trailing comma",
    input: '{"a": 1,}',
    cause:
      "A dict was serialised by something that allows trailing commas, or a line was deleted and its comma left behind.",
    message: "Illegal trailing comma before end of object",
    position: "line 1 column 8 (char 7)",
    v8: "Expected double-quoted property name in JSON at position 8 (line 1 column 9)",
  },
  {
    label: "Unquoted key",
    input: "{a: 1}",
    cause:
      "The text is a JavaScript object literal or a config format, not JSON. The bare name is the problem, not the value.",
    message: "Expecting property name enclosed in double quotes",
    position: "line 1 column 2 (char 1)",
    v8: "Expected property name or '}' in JSON at position 1 (line 1 column 2)",
  },
  {
    label: "Python literals True / None",
    input: '{"a": True, "b": None}',
    cause:
      "data = str(python_dict) instead of json.dumps(python_dict). The capital T and the word None are Python, never JSON.",
    message: "Expecting value",
    position: "line 1 column 7 (char 6)",
    v8: 'Unexpected token \'T\', "{"a": True, "b":"... is not valid JSON',
  },
  {
    label: "NaN literal",
    input: '{"a": NaN}',
    cause:
      "Not a mistake at all as far as Python is concerned. This is the one malformed input in the table that is accepted.",
    message: null,
    position: "",
    v8: 'Unexpected token \'N\', "{"a": NaN}" is not valid JSON',
  },
  {
    label: "Comment after the document",
    input: '{"a": 1} // note',
    cause:
      "JSONC or JSON5 was pasted in, or a shell script echoed a document that already had a comment appended.",
    message: "Extra data",
    position: "line 1 column 10 (char 9)",
    v8: "Unexpected non-whitespace character after JSON at position 9 (line 1 column 10)",
  },
  {
    label: "Empty response body",
    input: "",
    cause:
      "An HTTP body of length zero: a 204, a proxy that stripped the payload, or a request that never completed.",
    message: "Expecting value",
    position: "line 1 column 1 (char 0)",
    v8: "Unexpected end of JSON input",
  },
  {
    label: "Two documents concatenated",
    input: '{"a":1}{"b":2}',
    cause:
      "A stream of newline-delimited JSON was read as a single document, or two writes landed in the same buffer.",
    message: "Extra data",
    position: "line 1 column 8 (char 7)",
    v8: "Unexpected non-whitespace character after JSON at position 7 (line 1 column 8)",
  },
  {
    label: "Byte-order mark kept in the string",
    input: '\ufeff{"a":1}',
    display: "<U+FEFF>{\"a\":1}",
    cause:
      "The file was opened in text mode on Windows, or written by an editor that adds a BOM, and the BOM survived into the string.",
    message: "Unexpected UTF-8 BOM (decode using utf-8-sig)",
    position: "line 1 column 1 (char 0)",
    v8: "Unexpected token '\ufeff', \"\ufeff{\"a\":1}\" is not valid JSON",
  },
  {
    label: "Literal newline inside a string",
    input: '{"a": "line\nbreak"}',
    display: '{"a": "line\\nbreak"} with a real line break',
    cause:
      "A multi-line value was pasted in directly. JSON strings cannot contain a raw newline; it has to be the two characters \\n.",
    message: "Invalid control character at",
    position: "line 1 column 12 (char 11)",
    v8: "Bad control character in string literal in JSON at position 11 (line 1 column 12)",
  },
  {
    label: "Leading zero in a number",
    input: '{"a": 01}',
    cause:
      "An identifier, a zip code or a zero-padded date was written as a number. JSON forbids leading zeros, so the parser reads 0 and then finds a stray 1.",
    message: "Expecting ',' delimiter",
    position: "line 1 column 8 (char 7)",
    v8: "Unexpected number in JSON at position 7 (line 1 column 8)",
  },
  {
    label: "Whole document wrapped in quotes",
    input: "'{\"a\":1}'",
    cause:
      "The value was passed through repr(), or printed into a log line, so the document became a string literal containing a document.",
    message: "Expecting value",
    position: "line 1 column 1 (char 0)",
    v8: "Unexpected token ''', \"'{\"a\":1}'\" is not valid JSON",
  },
  {
    label: "HTML page",
    input: "<!DOCTYPE html><html></html>",
    cause:
      "The request hit a login page, a captive portal or a single-page app that answers every path with index.html.",
    message: "Expecting value",
    position: "line 1 column 1 (char 0)",
    v8: 'Unexpected token \'<\', "<!DOCTYPE "... is not valid JSON',
  },
  {
    label: "JSON inside an assignment",
    input: 'const cfg = {"a":1};',
    cause:
      "A line was copied out of a JavaScript source file. The document is a statement, and the statement is not JSON.",
    message: "Expecting value",
    position: "line 1 column 1 (char 0)",
    v8: 'Unexpected token \'c\', "const cfg = {"a":1};" is not valid JSON',
  },
];

/** One input, four interpreters: the only message that moved between releases. */
export const TRAILING_COMMA_BY_VERSION = [
  {
    version: "3.9.6",
    message: "Expecting property name enclosed in double quotes",
    position: "line 1 column 9 (char 8)",
  },
  {
    version: "3.10.8",
    message: "Expecting property name enclosed in double quotes",
    position: "line 1 column 9 (char 8)",
  },
  {
    version: "3.12.14",
    message: "Expecting property name enclosed in double quotes",
    position: "line 1 column 9 (char 8)",
  },
  {
    version: "3.13.12",
    message: "Illegal trailing comma before end of object",
    position: "line 1 column 8 (char 7)",
  },
] as const;

/** The same bytes, handed over as bytes or as a decoded string. */
export const BYTES_CASES = [
  {
    label: "UTF-8 file with a BOM, read as bytes",
    value: "json.loads(open(path, 'rb').read())",
    outcome: "accepted",
    detail: "Bytes are decoded with BOM detection, so the BOM is removed before parsing starts.",
  },
  {
    label: "The same file, read as text",
    value: "json.loads(open(path, encoding='utf-8').read())",
    outcome: "rejected",
    detail: "The BOM survives as U+FEFF, which is not whitespace and not a value.",
  },
  {
    label: "A UTF-16 encoded document, read as bytes",
    value: "json.loads('{\"a\":1}'.encode('utf-16'))",
    outcome: "accepted",
    detail: "The BOM in the first bytes is enough for Python to pick the UTF-16 codec.",
  },
  {
    label: "Latin-1 bytes",
    value: "json.loads(b'{\"name\": \"caf\\xe9\"}')",
    outcome: "UnicodeDecodeError",
    detail: "Not a JSON error at all, so `except json.JSONDecodeError` does not catch it.",
  },
] as const;
