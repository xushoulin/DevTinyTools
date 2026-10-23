import { describe, expect, it } from "vitest";
import {
  DEFAULT_DIFF_OPTIONS,
  MAX_DIFF_ENTRIES,
  canonicalize,
  childPath,
  diffJson,
  indexPath,
  previewValue,
  type DiffOptions,
} from "./json-diff";

const ordered: DiffOptions = { ignoreKeyOrder: true, ignoreArrayOrder: false };
const ignored: DiffOptions = { ignoreKeyOrder: true, ignoreArrayOrder: true };
const strict: DiffOptions = { ignoreKeyOrder: false, ignoreArrayOrder: false };

describe("childPath", () => {
  it("uses dot notation for identifier keys", () => {
    expect(childPath("$", "total")).toBe("$.total");
    expect(childPath("$.a", "_b2")).toBe("$.a._b2");
  });

  it("falls back to bracket notation for anything else", () => {
    expect(childPath("$", "odd key")).toBe('$["odd key"]');
    expect(childPath("$", "a.b")).toBe('$["a.b"]');
    expect(childPath("$", "1st")).toBe('$["1st"]');
    expect(childPath("$", "")).toBe('$[""]');
  });

  it("builds array paths", () => {
    expect(indexPath("$.items", 3)).toBe("$.items[3]");
    expect(indexPath("$", 0)).toBe("$[0]");
  });
});

describe("canonicalize", () => {
  it("ignores key order", () => {
    expect(canonicalize({ a: 1, b: 2 })).toBe(canonicalize({ b: 2, a: 1 }));
  });

  it("distinguishes array order", () => {
    expect(canonicalize([1, 2])).not.toBe(canonicalize([2, 1]));
  });

  it("distinguishes types that stringify alike", () => {
    expect(canonicalize("1")).not.toBe(canonicalize(1));
    expect(canonicalize(null)).not.toBe(canonicalize("null"));
  });

  it("is stable for nested structures", () => {
    const a = { z: [{ b: 1, a: 2 }], y: null };
    const b = { y: null, z: [{ a: 2, b: 1 }] };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });
});

describe("diffJson — primitives", () => {
  it("reports nothing for equal values", () => {
    const result = diffJson({ a: 1 }, { a: 1 }, ordered);
    expect(result.entries).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("reports a changed primitive with before and after", () => {
    const result = diffJson({ a: 1 }, { a: 2 }, ordered);
    expect(result.entries).toEqual([
      { path: "$.a", type: "changed", before: 1, after: 2, detail: "1 → 2" },
    ]);
  });

  it("treats -0 and 0 as equal, matching how JSON prints them", () => {
    const result = diffJson(JSON.parse("-0"), JSON.parse("0"), ordered);
    expect(result.entries).toHaveLength(0);
  });

  it("reports a type change explicitly", () => {
    const result = diffJson({ id: 42 }, { id: "42" }, ordered);
    expect(result.entries[0]).toMatchObject({
      path: "$.id",
      type: "changed",
      detail: "number → string",
    });
  });

  it("distinguishes null from a missing value", () => {
    const result = diffJson({ a: null }, {}, ordered);
    expect(result.entries[0]).toMatchObject({ path: "$.a", type: "removed", before: null });
  });

  it("compares the two documents themselves when they are scalars", () => {
    expect(diffJson("a", "b", ordered).entries[0].path).toBe("$");
  });
});

describe("diffJson — objects", () => {
  it("reports added and removed members", () => {
    const result = diffJson({ a: 1, b: 2 }, { a: 1, c: 3 }, ordered);
    const byPath = Object.fromEntries(result.entries.map((e) => [e.path, e.type]));

    expect(byPath).toEqual({ "$.b": "removed", "$.c": "added" });
  });

  it("recurses into nested objects and builds the full path", () => {
    const result = diffJson(
      { orders: [{ total: 10 }] },
      { orders: [{ total: 12 }] },
      ordered,
    );
    expect(result.entries[0].path).toBe("$.orders[0].total");
  });

  it("does not report key order by default", () => {
    const result = diffJson({ a: 1, b: 2 }, { b: 2, a: 1 }, ordered);
    expect(result.entries).toHaveLength(0);
  });

  it("reports key order in strict mode", () => {
    const result = diffJson({ a: 1, b: 2 }, { b: 2, a: 1 }, strict);
    expect(result.entries).toEqual([
      { path: "$", type: "reordered", detail: "[a, b] → [b, a]" },
    ]);
  });

  it("does not report order when a member was added", () => {
    const result = diffJson({ a: 1, b: 2 }, { a: 1, b: 2, c: 3 }, strict);
    expect(result.entries.map((e) => e.type)).toEqual(["added"]);
  });

  it("quotes keys that are not identifiers", () => {
    const result = diffJson({ "a.b": 1 }, { "a.b": 2 }, ordered);
    expect(result.entries[0].path).toBe('$["a.b"]');
  });

  it("compares deeply nested objects", () => {
    const result = diffJson(
      { a: { b: { c: { d: 1 } } } },
      { a: { b: { c: { d: 2 } } } },
      ordered,
    );
    expect(result.entries[0].path).toBe("$.a.b.c.d");
  });
});

describe("diffJson — arrays in order", () => {
  it("compares element by element", () => {
    const result = diffJson([1, 2, 3], [1, 5, 3], ordered);
    expect(result.entries).toEqual([
      { path: "$[1]", type: "changed", before: 2, after: 5, detail: "2 → 5" },
    ]);
  });

  it("reports a shorter array as removals", () => {
    const result = diffJson([1, 2, 3], [1], ordered);
    expect(result.entries.map((e) => [e.path, e.type])).toEqual([
      ["$[1]", "removed"],
      ["$[2]", "removed"],
    ]);
  });

  it("reports a longer array as additions", () => {
    const result = diffJson([1], [1, 2], ordered);
    expect(result.entries.map((e) => [e.path, e.type])).toEqual([["$[1]", "added"]]);
  });

  it("treats a reorder as changes when order matters", () => {
    const result = diffJson([1, 2], [2, 1], ordered);
    expect(result.entries).toHaveLength(2);
  });
});

describe("diffJson — arrays ignoring order", () => {
  it("reports nothing for a pure reorder", () => {
    const result = diffJson([1, 2, 3], [3, 1, 2], ignored);
    expect(result.entries).toHaveLength(0);
  });

  it("matches objects regardless of their key order", () => {
    const result = diffJson([{ a: 1, b: 2 }], [{ b: 2, a: 1 }], ignored);
    expect(result.entries).toHaveLength(0);
  });

  it("reports an edited element as one removal plus one addition", () => {
    const result = diffJson([1, 2, 3], [1, 9, 3], ignored);
    expect(result.entries.map((e) => e.type).sort()).toEqual(["added", "removed"]);
  });

  it("keeps duplicate values distinguishable", () => {
    const result = diffJson([1, 1, 2], [1, 2], ignored);
    expect(result.entries.map((e) => [e.path, e.type])).toEqual([["$[1]", "removed"]]);
  });

  it("ignores order at every nesting level", () => {
    const result = diffJson(
      { tags: ["x", "y"], nested: { list: [1, 2] } },
      { nested: { list: [2, 1] }, tags: ["y", "x"] },
      ignored,
    );
    expect(result.entries).toHaveLength(0);
  });
});

describe("diffJson — limits and summary", () => {
  it("counts each change type", () => {
    const result = diffJson({ a: 1, b: 2, c: 3 }, { a: 9, c: 3, d: 4 }, ordered);
    expect(result.counts).toEqual({ added: 1, removed: 1, changed: 1, reordered: 0 });
    expect(result.total).toBe(3);
  });

  it("stops at the entry cap and says so", () => {
    const before: Record<string, number> = {};
    const after: Record<string, number> = {};
    for (let i = 0; i < MAX_DIFF_ENTRIES + 50; i += 1) {
      before[`k${i}`] = 1;
      after[`k${i}`] = 2;
    }

    const result = diffJson(before, after, ordered);
    expect(result.truncated).toBe(true);
    expect(result.entries).toHaveLength(MAX_DIFF_ENTRIES);
  });

  it("accepts the defaults without options", () => {
    expect(DEFAULT_DIFF_OPTIONS).toEqual({ ignoreKeyOrder: true, ignoreArrayOrder: false });
    expect(diffJson({ a: 1 }, { a: 2 }).total).toBe(1);
  });
});

describe("previewValue", () => {
  it("renders scalars", () => {
    expect(previewValue(1)).toBe("1");
    expect(previewValue("hi")).toBe('"hi"');
    expect(previewValue(null)).toBe("null");
    expect(previewValue(true)).toBe("true");
  });

  it("renders structures as compact JSON", () => {
    expect(previewValue({ a: 1 })).toBe('{"a":1}');
  });

  it("truncates long output", () => {
    const long = "x".repeat(200);
    const text = previewValue(long, 40);
    expect(text.length).toBeLessThanOrEqual(40);
    expect(text.endsWith("…")).toBe(true);
  });

  it("renders a missing side as a dash", () => {
    expect(previewValue(undefined)).toBe("—");
  });
});
