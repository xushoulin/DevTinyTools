/**
 * Structural comparison of two parsed JSON values.
 *
 * The output is a flat list of changes with a path per change, rather than a
 * rendered tree. A flat list is what makes the result useful: it can be copied
 * into a ticket, counted, or asserted on in a test. The UI renders it as rows.
 *
 * Two modes exist because both questions are legitimate:
 *
 * - `ignoreKeyOrder: true` (default) compares objects as sets of members, which
 *   is what a human means by "did the data change".
 * - `ignoreKeyOrder: false` additionally reports members that are unchanged in
 *   value but appear in a different order. That matters for signatures, ETags
 *   and any cache keyed on the serialised bytes.
 *
 * Arrays are compared position by position unless `ignoreArrayOrder` is on, in
 * which case elements are matched by value. Under that mode a matched pair is
 * identical by construction, so it can never produce a "changed" entry —
 * an edited element shows up as one removal plus one addition.
 */

export type DiffChangeType = "added" | "removed" | "changed" | "reordered";

export interface DiffEntry {
  /** JSONPath-style location, e.g. `$.orders[3].total`. */
  path: string;
  type: DiffChangeType;
  /** Value in the first document, absent for `added`. */
  before?: unknown;
  /** Value in the second document, absent for `removed`. */
  after?: unknown;
  /** Extra context for `changed` (e.g. "number → string") and `reordered`. */
  detail?: string;
}

export interface DiffOptions {
  ignoreKeyOrder: boolean;
  ignoreArrayOrder: boolean;
}

export const DEFAULT_DIFF_OPTIONS: DiffOptions = {
  ignoreKeyOrder: true,
  ignoreArrayOrder: false,
};

export interface DiffResult {
  entries: DiffEntry[];
  counts: Record<DiffChangeType, number>;
  total: number;
  /** True when the entry list was cut off at {@link MAX_DIFF_ENTRIES}. */
  truncated: boolean;
}

/** Guards the UI against a document pair that differs in thousands of places. */
export const MAX_DIFF_ENTRIES = 500;

/** Recursion guard. Real documents are far shallower, malformed ones may not be. */
const MAX_DEPTH = 64;

type JsonKind = "null" | "boolean" | "number" | "string" | "array" | "object";

function kindOf(value: unknown): JsonKind {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const type = typeof value;
  if (type === "boolean") return "boolean";
  if (type === "number") return "number";
  if (type === "string") return "string";
  return "object";
}

function isIdentifier(key: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key);
}

/** `$.orders[3].total`, or `$.a["odd key"]` when a key is not an identifier. */
export function childPath(base: string, key: string): string {
  return isIdentifier(key) ? `${base}.${key}` : `${base}[${JSON.stringify(key)}]`;
}

export function indexPath(base: string, index: number): string {
  return `${base}[${index}]`;
}

/**
 * Stable serialisation used to match array elements by value. Keys are sorted,
 * so two objects with the same members in a different order compare equal.
 */
export function canonicalize(value: unknown): string {
  return serialize(value, 0);
}

function serialize(value: unknown, depth: number): string {
  if (depth > MAX_DEPTH) return '"<max-depth>"';

  switch (kindOf(value)) {
    case "null":
      return "null";
    case "boolean":
      return value ? "true" : "false";
    case "number":
      return JSON.stringify(value);
    case "string":
      return JSON.stringify(value);
    case "array":
      return `[${(value as unknown[])
        .map((item) => serialize(item, depth + 1))
        .join(",")}]`;
    case "object": {
      const record = value as Record<string, unknown>;
      const body = Object.keys(record)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${serialize(record[key], depth + 1)}`)
        .join(",");
      return `{${body}}`;
    }
  }
}

function describeValue(value: unknown): string {
  const kind = kindOf(value);
  if (kind === "array") return `array(${(value as unknown[]).length})`;
  if (kind === "object") return `object(${Object.keys(value as object).length})`;
  if (kind === "string") {
    const text = value as string;
    return text.length > 40 ? `string(${text.length} chars)` : JSON.stringify(text);
  }
  return String(value);
}

export function diffJson(
  before: unknown,
  after: unknown,
  options: DiffOptions = DEFAULT_DIFF_OPTIONS,
): DiffResult {
  const entries: DiffEntry[] = [];
  let truncated = false;

  const push = (entry: DiffEntry) => {
    if (entries.length >= MAX_DIFF_ENTRIES) {
      truncated = true;
      return;
    }
    entries.push(entry);
  };

  const walk = (a: unknown, b: unknown, path: string, depth: number) => {
    if (entries.length >= MAX_DIFF_ENTRIES) {
      truncated = true;
      return;
    }

    const kindA = kindOf(a);
    const kindB = kindOf(b);

    if (kindA !== kindB) {
      push({
        path,
        type: "changed",
        before: a,
        after: b,
        detail: `${kindA} → ${kindB}`,
      });
      return;
    }

    switch (kindA) {
      case "object":
        walkObjects(
          a as Record<string, unknown>,
          b as Record<string, unknown>,
          path,
          depth,
          options,
          walk,
          push,
        );
        return;
      case "array":
        walkArrays(a as unknown[], b as unknown[], path, depth, options, walk, push);
        return;
      default:
        // `===` treats -0 and 0 as equal, which matches how JSON prints them.
        if (a !== b) {
          push({
            path,
            type: "changed",
            before: a,
            after: b,
            detail: `${describeValue(a)} → ${describeValue(b)}`,
          });
        }
    }
  };

  walk(before, after, "$", 0);

  const counts: Record<DiffChangeType, number> = {
    added: 0,
    removed: 0,
    changed: 0,
    reordered: 0,
  };
  for (const entry of entries) counts[entry.type] += 1;

  return { entries, counts, total: entries.length, truncated };
}

type WalkFn = (a: unknown, b: unknown, path: string, depth: number) => void;
type PushFn = (entry: DiffEntry) => void;

function walkObjects(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  path: string,
  depth: number,
  options: DiffOptions,
  walk: WalkFn,
  push: PushFn,
) {
  if (depth > MAX_DEPTH) {
    push({ path, type: "changed", detail: "maximum depth reached" });
    return;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  const setB = new Set(keysB);
  const setA = new Set(keysA);

  // Removals first so the output reads before → after within each level.
  for (const key of keysA) {
    if (!setB.has(key)) {
      push({ path: childPath(path, key), type: "removed", before: a[key] });
    }
  }

  for (const key of keysB) {
    if (!setA.has(key)) {
      push({ path: childPath(path, key), type: "added", after: b[key] });
      continue;
    }
    walk(a[key], b[key], childPath(path, key), depth + 1);
  }

  if (!options.ignoreKeyOrder) {
    const sharedA = keysA.filter((key) => setB.has(key));
    const sharedB = keysB.filter((key) => setA.has(key));
    const orderDiffers = sharedA.some((key, index) => key !== sharedB[index]);

    if (orderDiffers) {
      push({
        path,
        type: "reordered",
        detail: `[${sharedA.join(", ")}] → [${sharedB.join(", ")}]`,
      });
    }
  }
}

function walkArrays(
  a: unknown[],
  b: unknown[],
  path: string,
  depth: number,
  options: DiffOptions,
  walk: WalkFn,
  push: PushFn,
) {
  if (depth > MAX_DEPTH) {
    push({ path, type: "changed", detail: "maximum depth reached" });
    return;
  }

  if (!options.ignoreArrayOrder) {
    const max = Math.max(a.length, b.length);
    for (let index = 0; index < max; index += 1) {
      const itemPath = indexPath(path, index);

      if (index >= a.length) {
        push({ path: itemPath, type: "added", after: b[index] });
      } else if (index >= b.length) {
        push({ path: itemPath, type: "removed", before: a[index] });
      } else {
        walk(a[index], b[index], itemPath, depth + 1);
      }
    }
    return;
  }

  // Order-insensitive: consume matches from a pool keyed by canonical value.
  const pool = new Map<string, number[]>();
  b.forEach((item, index) => {
    const key = canonicalize(item);
    const bucket = pool.get(key);
    if (bucket) bucket.push(index);
    else pool.set(key, [index]);
  });

  const unmatchedB = new Set(b.map((_, index) => index));
  const unmatchedA: number[] = [];

  a.forEach((item, index) => {
    const key = canonicalize(item);
    const bucket = pool.get(key);
    if (bucket && bucket.length > 0) {
      const matched = bucket.shift()!;
      unmatchedB.delete(matched);
    } else {
      unmatchedA.push(index);
    }
  });

  for (const index of unmatchedA) {
    push({
      path: indexPath(path, index),
      type: "removed",
      before: a[index],
      detail: "no equal value in the second document",
    });
  }

  for (const index of [...unmatchedB].sort((x, y) => x - y)) {
    push({
      path: indexPath(path, index),
      type: "added",
      after: b[index],
      detail: "no equal value in the first document",
    });
  }
}

/** Single line description of a value for the result list. */
export function previewValue(value: unknown, maxLength = 90): string {
  if (value === undefined) return "—";

  let text: string;
  try {
    text = JSON.stringify(value) ?? String(value);
  } catch {
    text = String(value);
  }

  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}
