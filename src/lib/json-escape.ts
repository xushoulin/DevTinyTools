/**
 * Escaping and unescaping JSON string content.
 *
 * Two decisions shape this module.
 *
 * The encoder reproduces `JSON.stringify` by default rather than inventing its
 * own table, so the output matches what the browser would produce for the same
 * input. The two deviations `JSON.stringify` does not offer — escaping non-ASCII
 * and escaping forward slashes — are opt-in, because both make the payload
 * larger and neither is required by the JSON grammar.
 *
 * The decoder is strict first and lenient second. A string that the browser's
 * parser accepts is decoded by that parser, so the result cannot drift from the
 * language's own behaviour. Only when the parser rejects the input does the
 * lenient path take over, and then it reports every substitution it made. A
 * decoder that silently repairs `\x41` teaches the user nothing about why their
 * code failed; one that repairs it and says so does.
 */

export interface EscapeOptions {
  /** Escape every code unit above U+007E as \uXXXX, the way Python's default does. */
  escapeNonAscii: boolean;
  /** Escape `/` as `\/`, the way PHP's json_encode does. Not required by JSON. */
  escapeSlash: boolean;
  /** Surround the result with double quotes so it can be pasted as a value. */
  wrapInQuotes: boolean;
}

export const DEFAULT_ESCAPE_OPTIONS: EscapeOptions = {
  escapeNonAscii: false,
  escapeSlash: false,
  wrapInQuotes: true,
};

/** The five control characters JSON gives a two-character form. */
const SHORT_ESCAPES: Record<string, string> = {
  "\b": "\\b",
  "\t": "\\t",
  "\n": "\\n",
  "\f": "\\f",
  "\r": "\\r",
};

/** The eight escape sequences JSON actually defines. */
const JSON_ESCAPE_TARGETS: Record<string, string> = {
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
  '"': '"',
  "\\": "\\",
  "/": "/",
};

function hex4(code: number): string {
  return code.toString(16).padStart(4, "0");
}

/**
 * Encode text so it can sit inside a JSON string.
 *
 * Iteration is by UTF-16 code unit, which is what makes astral characters come
 * out as surrogate pairs when non-ASCII escaping is on, exactly as Python's
 * `ensure_ascii=True` produces them.
 */
export function escapeJsonString(text: string, options: EscapeOptions): string {
  let out = "";

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const code = text.charCodeAt(index);

    if (char === '"') {
      out += '\\"';
      continue;
    }
    if (char === "\\") {
      out += "\\\\";
      continue;
    }

    const short = SHORT_ESCAPES[char];
    if (short !== undefined) {
      out += short;
      continue;
    }

    // Every remaining C0 control has to be escaped: JSON forbids them raw
    // inside a string.
    if (code < 0x20) {
      out += `\\u${hex4(code)}`;
      continue;
    }

    if (char === "/" && options.escapeSlash) {
      out += "\\/";
      continue;
    }

    if (options.escapeNonAscii && code > 0x7e) {
      out += `\\u${hex4(code)}`;
      continue;
    }

    out += char;
  }

  return options.wrapInQuotes ? `"${out}"` : out;
}

export interface UnescapeNote {
  /** The sequence exactly as it appeared in the input, including the backslash. */
  sequence: string;
  /** What the lenient decoder produced for it. */
  replacement: string;
  /** How many times the sequence occurred. */
  count: number;
}

export interface UnescapeResult {
  value: string;
  /** True when the browser's own JSON parser produced the value. */
  strict: boolean;
  /** True when the input was wrapped in double quotes and they were removed. */
  hadQuotes: boolean;
  /** Why the strict pass refused the input, or null when it succeeded. */
  strictError: string | null;
  /** Substitutions the lenient pass had to make. Empty on the strict path. */
  notes: UnescapeNote[];
}

function noteCollector() {
  const counts = new Map<string, { replacement: string; count: number }>();
  return {
    add(sequence: string, replacement: string) {
      const existing = counts.get(sequence);
      if (existing) {
        existing.count += 1;
        return;
      }
      counts.set(sequence, { replacement, count: 1 });
    },
    list(): UnescapeNote[] {
      return [...counts.entries()].map(([sequence, entry]) => ({
        sequence,
        replacement: entry.replacement,
        count: entry.count,
      }));
    },
  };
}

/**
 * Decode WITHOUT validating, recording every place the input was not legal
 * JSON. Used only after the strict pass has already failed.
 */
function lenientDecode(body: string): { value: string; notes: UnescapeNote[] } {
  const notes = noteCollector();
  let out = "";
  let index = 0;

  while (index < body.length) {
    const char = body[index];

    if (char !== "\\") {
      out += char;
      index += 1;
      continue;
    }

    // A backslash at the very end escapes nothing.
    if (index === body.length - 1) {
      out += "\\";
      notes.add("\\", "\\");
      index += 1;
      continue;
    }

    const next = body[index + 1];

    if (next === "u") {
      // ES2015 \u{...} form. Not valid JSON, but common in hand-written text.
      if (body[index + 2] === "{") {
        const close = body.indexOf("}", index + 3);
        const hex = close === -1 ? "" : body.slice(index + 3, close);
        const codePoint = /^[0-9a-fA-F]{1,6}$/.test(hex) ? Number.parseInt(hex, 16) : Number.NaN;

        if (!Number.isNaN(codePoint) && codePoint <= 0x10ffff) {
          const produced = String.fromCodePoint(codePoint);
          out += produced;
          notes.add(body.slice(index, close + 1), produced);
          index = close + 1;
          continue;
        }

        out += "\\u";
        notes.add("\\u", "\\u");
        index += 2;
        continue;
      }

      const hex = body.slice(index + 2, index + 6);
      if (/^[0-9a-fA-F]{4}$/.test(hex)) {
        out += String.fromCharCode(Number.parseInt(hex, 16));
        index += 6;
        continue;
      }

      // Fewer than four hex digits follow.
      out += "\\u";
      notes.add("\\u", "\\u");
      index += 2;
      continue;
    }

    // \xNN is a JavaScript string escape, not a JSON one.
    if (next === "x") {
      const hex = body.slice(index + 2, index + 4);
      if (/^[0-9a-fA-F]{2}$/.test(hex)) {
        const produced = String.fromCharCode(Number.parseInt(hex, 16));
        out += produced;
        notes.add(body.slice(index, index + 4), produced);
        index += 4;
        continue;
      }
      out += "x";
      notes.add("\\x", "x");
      index += 2;
      continue;
    }

    const simple = JSON_ESCAPE_TARGETS[next];
    if (simple !== undefined) {
      out += simple;
      index += 2;
      continue;
    }

    // Anything else: the backslash is dropped, which is what several parsers
    // quietly do and what confuses people most.
    out += next;
    notes.add(`\\${next}`, next);
    index += 2;
  }

  return { value: out, notes: notes.list() };
}

/**
 * Decode a JSON string body back to plain text.
 *
 * Accepts input with or without the surrounding double quotes, because people
 * paste both forms.
 */
export function unescapeJsonString(raw: string): UnescapeResult {
  const trimmed = raw.trim();
  const hadQuotes =
    trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"');

  if (hadQuotes) {
    try {
      const value = JSON.parse(trimmed);
      if (typeof value === "string") {
        return { value, strict: true, hadQuotes, strictError: null, notes: [] };
      }
    } catch (error) {
      return {
        ...lenientResult(trimmed.slice(1, -1), hadQuotes, error),
      };
    }
    // Parsed, but to a number, boolean, null or object: treat the text as a
    // body rather than as a JSON document.
  }

  try {
    const value = JSON.parse(`"${raw}"`);
    return { value, strict: true, hadQuotes: false, strictError: null, notes: [] };
  } catch (error) {
    return { ...lenientResult(raw, hadQuotes, error) };
  }
}

function lenientResult(
  body: string,
  hadQuotes: boolean,
  strictError: unknown,
): UnescapeResult {
  const { value, notes } = lenientDecode(body);
  return {
    value,
    strict: false,
    hadQuotes,
    strictError: strictError instanceof Error ? strictError.message : String(strictError),
    notes,
  };
}
