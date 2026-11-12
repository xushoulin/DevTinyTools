/**
 * JSON → CSV conversion.
 *
 * Pure functions only: the tool component parses text with the shared
 * `parseJson` helper first (so syntax errors surface in the standard error
 * panel), then hands the parsed value to `jsonValueToCsv`. Everything here is
 * synchronous and allocation-light so a one-megabyte payload stays responsive.
 *
 * Row model: the root value must be an array (or a single object, which is
 * wrapped in a one-element array). Each array element becomes one row.
 * - Object elements contribute their members as cells.
 * - Primitive elements become a single `value` cell.
 * - Nested objects are flattened to dotted paths when `flattenObjects` is on;
 *   otherwise every row serialises to one `json` column.
 * - Array values are never expanded into columns; they are written as compact
 *   JSON, because "one CSV per nested array" needs a key to group on and the
 *   union across rows is undefined for heterogeneous documents.
 */

export type CsvDelimiter = "," | ";" | "\t";

export interface CsvConversionOptions {
  /** Field separator. Tab maps to `\t`. */
  delimiter: CsvDelimiter;
  /** Flatten nested objects into dotted-path columns (`user.name`). */
  flattenObjects: boolean;
  /** Emit a header row built from the union of all column names. */
  includeHeader: boolean;
}

export interface CsvSuccess {
  ok: true;
  /** RFC 4180 CSV text with CRLF line endings. */
  csv: string;
  /** Number of data rows (header excluded). */
  rows: number;
  /** Column names in first-appearance order. */
  columns: string[];
}

export interface CsvFailure {
  ok: false;
  /** Plain-English reason, safe to show verbatim in the UI. */
  error: string;
}

export type CsvOutcome = CsvSuccess | CsvFailure;

export const CSV_DELIMITERS: Array<{ value: CsvDelimiter; label: string }> = [
  { value: ",", label: "Comma (,)" },
  { value: ";", label: "Semicolon (;)" },
  { value: "\t", label: "Tab" },
];

/**
 * The decision this module exists for. Returns a failure for every shape that
 * cannot be represented as a rectangular table, instead of silently writing
 * something a spreadsheet will mangle.
 */
export function jsonValueToCsv(
  value: unknown,
  options: CsvConversionOptions,
): CsvOutcome {
  // A single object converts to a one-row table — wrapping it keeps the
  // "paste any JSON with a root object or array" promise the page makes.
  const rows0 =
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? [value]
      : value;

  if (!Array.isArray(rows0)) {
    return {
      ok: false,
      error:
        "The root value must be an object or an array. Arrays of primitives are fine too — they become a one-column table.",
    };
  }

  if (rows0.length === 0) {
    return {
      ok: false,
      error: "The array is empty, so there is no row to write. CSV needs at least one record.",
    };
  }

  const rows: Array<Map<string, string>> = [];
  const columns: string[] = [];
  const seenColumns = new Set<string>();

  for (const element of rows0) {
    const row = buildRow(element, options.flattenObjects);

    for (const [key, cell] of row) {
      if (!seenColumns.has(key)) {
        seenColumns.add(key);
        columns.push(key);
      }
      // Stash the cell so the row is complete even when a later row adds a
      // column this row does not have.
      row.set(key, cell);
    }

    rows.push(row);
  }

  const lines: string[] = [];

  if (options.includeHeader) {
    lines.push(columns.map((name) => escapeCsvField(name, options.delimiter)).join(options.delimiter));
  }

  for (const row of rows) {
    const cells = columns.map((name) => escapeCsvField(row.get(name) ?? "", options.delimiter));
    lines.push(cells.join(options.delimiter));
  }

  return {
    ok: true,
    // RFC 4180 specifies CRLF line endings; Excel agrees.
    csv: lines.join("\r\n") + "\r\n",
    rows: rows.length,
    columns,
  };
}

/** Convert one array element into an ordered map of column name → cell text. */
function buildRow(
  element: unknown,
  flattenObjects: boolean,
): Map<string, string> {
  const row = new Map<string, string>();

  if (element !== null && typeof element === "object" && !Array.isArray(element)) {
    if (flattenObjects) {
      flattenIntoRow(element as Record<string, unknown>, "", row);
    } else {
      row.set("json", serializeCell(element));
    }
    return row;
  }

  // Primitive or array element: one column, whatever the row count.
  row.set("value", serializeCell(element));
  return row;
}

function flattenIntoRow(
  source: Record<string, unknown>,
  prefix: string,
  row: Map<string, string>,
): void {
  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      flattenIntoRow(value as Record<string, unknown>, path, row);
    } else {
      row.set(path, serializeCell(value));
    }
  }
}

/**
 * Cell serialisation rules, chosen so a spreadsheet round-trip keeps the data
 * readable: null → empty (not the string "null"), booleans and numbers via
 * `String()`, anything structural as compact JSON.
 */
export function serializeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/**
 * Quote a field when the delimiter, a double quote or a line break appears in
 * it. RFC 4180 escaping: double the quotes inside. Fields with leading or
 * trailing spaces are left unquoted — Excel trims those anyway and quoting
 * every field doubles file size for no benefit.
 */
export function escapeCsvField(field: string, delimiter: CsvDelimiter): string {
  if (!field.includes(delimiter) && !field.includes('"') && !field.includes("\n") && !field.includes("\r")) {
    return field;
  }
  return `"${field.replace(/"/g, '""')}"`;
}
