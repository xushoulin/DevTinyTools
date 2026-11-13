import { describe, expect, it } from "vitest";
import { inferType } from "./type-infer";
import { emitGo, toGoFieldName } from "./go-emit";

describe("emitGo", () => {
  it("emits one struct with json tags for a flat object", () => {
    const { code, typeCount, lineCount } = emitGo(inferType({ id: 1, name: "Ada" }), {
      rootName: "User",
    });

    expect(typeCount).toBe(1);
    expect(lineCount).toBe(4);
    expect(code).toBe(
      [
        "type User struct {",
        '\tID   int64  `json:"id"`',
        '\tName string `json:"name"`',
        "}",
        "",
      ].join("\n"),
    );
  });

  it("keeps whole numbers as int64 and widens mixed ones to float64", () => {
    const { code } = emitGo(
      inferType({ count: 3, price: 1.5, mixed: 2 }),
      { rootName: "Order" },
    );

    expect(code).toContain("Count int64");
    expect(code).toContain("Price float64");

    const widened = emitGo(inferType([{ qty: 1 }, { qty: 1.5 }]), { rootName: "Row" });
    expect(widened.code).toContain("Qty float64");
  });

  it("marks keys missing from some samples with omitempty, not a pointer", () => {
    const { code } = emitGo(inferType([{ id: 1, name: "Ada" }, { id: 2 }]), {
      rootName: "Row",
    });

    expect(code).toContain('Name string `json:"name,omitempty"`');
    expect(code).toContain('ID   int64  `json:"id"`');
    expect(code).not.toContain("*string");
  });

  it("turns nullable fields into pointers so nil is representable", () => {
    const { code } = emitGo(inferType({ lastSeenAt: null, name: "Ada" }), {
      rootName: "User",
    });

    // A key that is only ever null has no concrete type to point at.
    expect(code).toContain('LastSeenAt any    `json:"lastSeenAt"`');

    const sometimes = emitGo(
      inferType([{ at: "2026-01-01" }, { at: null }]),
      { rootName: "Row" },
    );
    expect(sometimes.code).toContain('At *string `json:"at"`');
  });

  it("does not double-wrap slices that are already nil-able", () => {
    const { code } = emitGo(
      inferType([{ tags: ["a"] }, { tags: null }]),
      { rootName: "Row" },
    );

    expect(code).toContain('Tags []string `json:"tags"`');
    expect(code).not.toContain("*[]string");
  });

  it("collapses two unrelated kinds into any", () => {
    const { code } = emitGo(inferType([{ value: 1 }, { value: "one" }]), {
      rootName: "Row",
    });

    expect(code).toContain('Value any `json:"value"`');
  });

  it("hoists nested objects into their own struct and references them", () => {
    const { code, typeCount } = emitGo(
      inferType({ address: { city: "London" } }),
      { rootName: "Root" },
    );

    expect(typeCount).toBe(2);
    expect(code).toContain("Address RootAddress");
    expect(code).toContain("type RootAddress struct {");
  });

  it("drops omitempty everywhere when the option is off", () => {
    const { code } = emitGo(inferType([{ a: 1, b: 2 }, { a: 1 }]), {
      rootName: "Row",
      omitempty: false,
    });

    expect(code).toContain('B int64 `json:"b"`');
    expect(code).not.toContain("omitempty");
  });

  it("names a root that is not an object instead of inventing a struct", () => {
    const { code, typeCount } = emitGo(
      inferType([{ sku: "J-01" }]),
      { rootName: "Items" },
    );

    expect(code).toContain("type ItemsItem struct {");
    expect(code).toContain("type Items []ItemsItem");
    expect(typeCount).toBe(2);
  });

  it("prefixes a package clause only when asked", () => {
    const withPackage = emitGo(inferType({ id: 1 }), { packageName: "models" });
    const without = emitGo(inferType({ id: 1 }));

    expect(withPackage.code.startsWith("package models\n\n")).toBe(true);
    expect(without.code.startsWith("type ")).toBe(true);
  });
});

describe("toGoFieldName", () => {
  it("applies Go initialisms", () => {
    expect(toGoFieldName("id")).toBe("ID");
    expect(toGoFieldName("user_id")).toBe("UserID");
    expect(toGoFieldName("apiUrl")).toBe("APIURL");
    expect(toGoFieldName("created_at")).toBe("CreatedAt");
    expect(toGoFieldName("uuid")).toBe("UUID");
  });

  it("falls back to a safe identifier for keys json allows", () => {
    expect(toGoFieldName("2fa")).toBe("X2fa");
    expect(toGoFieldName("user-name")).toBe("UserName");
    expect(toGoFieldName("--")).toBe("Field");
    expect(toGoFieldName("")).toBe("Field");
  });
});

describe("emitGo tags", () => {
  it("escapes quotes and backticks in keys", () => {
    const quoted = emitGo(inferType({ 'a"b': 1 }), { rootName: "Row" });
    expect(quoted.code).toContain('`json:"a\\"b"`');

    const backtick = emitGo(inferType({ "a`b": 1 }), { rootName: "Row" });
    expect(backtick.code).toContain('"json:\\"a`b\\""');
  });

  it("de-duplicates field names that collapse to the same identifier", () => {
    const { code } = emitGo(inferType({ user_id: 1, userId: 2 }), { rootName: "Row" });
    expect(code).toContain("UserID  int64");
    expect(code).toContain("UserID2 int64");
  });
});
