/**
 * CSV → JSON conversion.
 *
 * The counterpart of `csv.ts`. Pure functions: the component hands raw text
 * and options to `csvToJson` and renders the outcome.
 *
 * Design rules:
 * - RFC 4180 parsing: quoted fields may contain the delimiter, doubled quotes
 *   and line breaks. The state machine is strict about closing quotes.
 * - The delimiter can be detected, because real files arrive from Excel and
 *   from European locales (semicolon) and from TSV dumps.
 * - Type inference only converts a cell when the conversion round-trips
 *   exactly: `String(Number(cell)) === cell`. So `19.5` becomes a number but
 *   `19.50` and 19-digit IDs stay strings — the output re-serialises to the
 *   same bytes the input came from, which is the property this tool sells.
 * - Empty cells become null (matching `serializeCell` in `csv.ts`), so a
 *   JSON → CSV → JSON round trip is lossless for the shapes csv.ts emits.
 * - Dotted header names (`user.name`) unflatten into nested objects, the
 *   inverse of `flattenObjects` on the way in.
 */

import type { CsvDelimiter } from "./csv";

export type CsvInputDelimiter = "auto" | CsvDelimiter;

export interface CsvToJsonOptions {
  /** `"auto"` counts separator candidates outside quotes and picks the winner. */
  delimiter: CsvInputDelimiter;
  /** Treat the first row as column names instead of data. */
  header: boolean;
  /** Convert numbers and booleans when (and only when) they round-trip exactly. */
  inferTypes: boolean;
  /** Turn dotted header names back into nested objects. */
  unflatten: boolean;
}

export interface CsvToJsonSuccess {
  ok: true;
  /** Pretty-printed JSON (2-space indent). */
  json: string;
  /** Number of data records written. */
  rows: number;
  /** Column names from the header row, or generated names like `column1`. */
  columns: string[];
  /** Non-fatal notes: ragged rows, duplicate headers, detected delimiter. */
  warnings: string[];
}

export interface CsvToJsonFailure {
  ok: false;
  /** Plain-English reason, safe to show verbatim in the UI. */
  error: string;
}

export type CsvToJsonOutcome = CsvToJsonSuccess | CsvToJsonFailure;

export const CSV_INPUT_DELIMITERS: Array<{ value: CsvInputDelimiter; label: string }> = [
  { value: "auto", label: "Detect" },
  { value: ",", label: "Comma (,)" },
  { value: ";", label: "Semicolon (;)" },
  { value: "\t", label: "Tab" },
];

export function csvToJson(text: string, options: CsvToJsonOptions): CsvToJsonOutcome {
  if (!text.trim()) {
    return { ok: false, error: "The input is empty. Paste CSV text or open a file first." };
  }

  const detected =
    options.delimiter === "auto"
      ? detectDelimiter(text)
      : { delimiter: options.delimiter, warning: null as string | null };

  const parsed = parseCsv(text, detected.delimiter);
  if (!parsed.ok) return parsed;

  const table = parsed.rows;
  if (table.length === 0) {
    return { ok: false, error: "The file has no rows, so there is nothing to convert." };
  }

  const warnings: string[] = [];
  if (detected.warning) warnings.push(detected.warning);

  const headerRow = options.header ? table[0] : null;
  const dataRows = options.header ? table.slice(1) : table;

  if (options.header && dataRows.length === 0) {
    warnings.push("The file contains only a header row, so the result is an empty array.");
  }

  let columns: string[];
  if (headerRow) {
    columns = headerRow.map((name, index) => {
      const trimmed = name.trim();
      return trimmed || `column${index + 1}`;
    });
    const seen = new Map<string, number>();
    columns = columns.map((name) => {
      const count = seen.get(name) ?? 0;
      seen.set(name, count + 1);
      return count === 0 ? name : `${name}_${count + 1}`;
    });
    if (headerRow.some((name) => name.trim() === "")) {
      warnings.push("Some header cells were empty; those columns were named columnN.");
    }
  } else {
    const width = table.reduce((max, row) => Math.max(max, row.length), 0);
    columns = Array.from({ length: width }, (_, index) => `column${index + 1}`);
  }

  const expectedWidth = columns.length;
  let ragged = false;

  const records: unknown[] = dataRows.map((cells) => {
    if (cells.length !== expectedWidth) ragged = true;
    const padded = padRow(cells, expectedWidth);
    return buildRecord(padded, columns, options);
  });

  if (ragged) {
    warnings.push(
      "Some rows had a different column count than the header; missing cells became null and extra cells were dropped.",
    );
  }

  return {
    ok: true,
    json: JSON.stringify(records, null, 2) + "\n",
    rows: records.length,
    columns,
    warnings,
  };
}

/** Pad short rows with empty cells; drop surplus cells beyond `width`. */
function padRow(cells: string[], width: number): string[] {
  if (cells.length === width) return cells;
  const padded = cells.slice(0, width);
  while (padded.length < width) padded.push("");
  return padded;
}

/** Build one record, honouring the unflatten option. */
function buildRecord(
  cells: string[],
  columns: string[],
  options: CsvToJsonOptions,
): unknown {
  const record: Record<string, unknown> = {};

  cells.forEach((cell, index) => {
    const name = columns[index];
    const value = convertCell(cell, options.inferTypes);

    if (options.unflatten && name.includes(".")) {
      setNestedPath(record, name.split("."), value);
    } else {
      record[name] = value;
    }
  });

  return record;
}

/** Assign into `path` without clobbering an intermediate string/number value. */
function setNestedPath(target: Record<string, unknown>, path: string[], value: unknown): void {
  let node: Record<string, unknown> = target;

  for (let index = 0; index < path.length - 1; index++) {
    const key = path[index];
    const existing = node[key];

    if (existing === null || typeof existing !== "object" || Array.isArray(existing)) {
      // Either the path is new, or a shallower column already wrote a plain
      // value here (`user` and `user.name` both present). The object wins,
      // because losing `user.name` is worse than losing `user`.
      node[key] = {};
    }
    node = node[key] as Record<string, unknown>;
  }

  node[path[path.length - 1]] = value;
}

/**
 * Type inference with an exactness guard. A cell becomes a number or boolean
 * only when JavaScript round-trips it back to the same text, so nothing the
 * user typed is silently rewritten.
 */
export function convertCell(cell: string, inferTypes: boolean): unknown {
  if (!inferTypes) return cell;
  if (cell === "") return null;

  if (cell === "true") return true;
  if (cell === "false") return false;

  const trimmed = cell.trim();
  if (
    trimmed.length > 0 &&
    (trimmed === "." || /^[-+]?[0-9]/.test(trimmed)) &&
    /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(trimmed)
  ) {
    const value = Number(trimmed);
    // Reject rewrites: 19.50 → 19.5, "019" → 19, IDs beyond 2^53 all change
    // their text on the way back out, so they stay strings.
    if (String(value) === trimmed) return value;
  }

  return cell;
}

/**
 * Pick the delimiter by counting candidates outside quoted fields. Ties and
 * zero counts fall back to comma with a warning.
 */
export function detectDelimiter(text: string): {
  delimiter: CsvDelimiter;
  warning: string | null;
} {
  const candidates: CsvDelimiter[] = [",", ";", "\t"];
  const counts = new Map<CsvDelimiter, number>(candidates.map((d) => [d, 0]));

  let inQuotes = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      // Doubled quotes stay inside the field; either way toggle only on the
      // second of a pair.
      if (inQuotes && text[index + 1] === '"') {
        index++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && counts.has(char as CsvDelimiter)) {
      counts.set(char as CsvDelimiter, counts.get(char as CsvDelimiter)! + 1);
    }
  }

  let best: CsvDelimiter = ",";
  let bestCount = 0;
  for (const [delimiter, count] of counts) {
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }

  if (bestCount === 0) {
    return {
      delimiter: ",",
      warning: "No separator was found on any line, so the comma was assumed.",
    };
  }

  return { delimiter: best, warning: null };
}

/**
 * RFC 4180 field parser. Returns rows of raw cell text; type conversion and
 * naming happen later. An unclosed quote is a hard error, not a recovered
 * guess — a guess here silently drops the rest of the file.
 */
export function parseCsv(
  text: string,
  delimiter: CsvDelimiter,
): { ok: true; rows: string[][] } | { ok: false; error: string } {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let sawAnyCell = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      sawAnyCell = true;
      continue;
    }

    if (char === delimiter) {
      row.push(cell);
      cell = "";
      sawAnyCell = true;
      continue;
    }

    if (char === "\r" || char === "\n") {
      // Treat CRLF and bare LF as row ends; swallow the CR of a CRLF pair.
      if (char === "\r" && text[index + 1] === "\n") index++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
      sawAnyCell = false;
      continue;
    }

    cell += char;
    sawAnyCell = true;
  }

  if (inQuotes) {
    return {
      ok: false,
      error:
        "A quoted field was never closed. Check the last quote in the file — everything after it was read as one cell.",
    };
  }

  // The final cell/row: flush it unless the file ended on a newline, in which
  // case there is no trailing empty row (RFC 4180 allows both).
  if (cell !== "" || sawAnyCell) {
    row.push(cell);
    rows.push(row);
  }

  // A trailing blank line is allowed, an interior fully-empty row is data the
  // user may want to see, so rows are not filtered here.
  return { ok: true, rows };
}
