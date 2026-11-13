import { describe, expect, it } from "vitest";
import {
  inferType,
  isValidIdentifier,
  mergeTypes,
  nameObjectTypes,
  toCamelCase,
  toPascalCase,
  typeSignature,
  type InferredType,
} from "./type-infer";

describe("inferType", () => {
  it("maps the primitive kinds", () => {
    expect(inferType("x")).toEqual({ kind: "string" });
    expect(inferType(1.5)).toEqual({ kind: "number" });
    expect(inferType(false)).toEqual({ kind: "boolean" });
    expect(inferType(null)).toEqual({ kind: "null" });
  });

  it("infers an object's properties in source order", () => {
    const result = inferType({ id: 1, name: "Ada", active: true });
    expect(result.kind).toBe("object");
    if (result.kind !== "object") return;
    expect(result.properties.map((property) => property.name)).toEqual(["id", "name", "active"]);
    expect(result.properties.every((property) => property.optional === false)).toBe(true);
  });

  it("merges array elements so keys missing from some become optional", () => {
    const result = inferType([
      { id: 1, name: "Ada" },
      { id: 2 },
    ]);
    expect(result.kind).toBe("array");
    if (result.kind !== "array" || result.items.kind !== "object") return;

    const byName = new Map(result.items.properties.map((property) => [property.name, property]));
    expect(byName.get("id")?.optional).toBe(false);
    expect(byName.get("name")?.optional).toBe(true);
  });

  it("unions disagreeing primitive kinds instead of guessing", () => {
    const result = inferType([1, "two"]);
    expect(result.kind).toBe("array");
    if (result.kind !== "array") return;
    expect(result.items.kind).toBe("union");
    if (result.items.kind !== "union") return;
    expect(result.items.options.map((option) => option.kind).sort()).toEqual(["number", "string"]);
  });

  it("keeps null as a union member rather than widening to unknown", () => {
    const result = inferType([{ note: "hi" }, { note: null }]);
    if (result.kind !== "array" || result.items.kind !== "object") throw new Error("shape");
    const note = result.items.properties.find((property) => property.name === "note");
    expect(note?.type.kind).toBe("union");
    expect(note?.optional).toBe(false);
  });

  it("merges nested objects recursively", () => {
    const result = inferType([{ a: { b: 1 } }, { a: {} }]);
    if (result.kind !== "array" || result.items.kind !== "object") throw new Error("shape");
    const a = result.items.properties.find((property) => property.name === "a");
    expect(a?.type.kind).toBe("object");
    if (a?.type.kind !== "object") return;
    expect(a.type.properties[0].name).toBe("b");
    expect(a.type.properties[0].optional).toBe(true);
  });

  it("treats an empty array's items as unknown", () => {
    const result = inferType([]);
    expect(result).toEqual({ kind: "array", items: { kind: "unknown" } });
  });

  it("gives up past the depth limit", () => {
    let value: unknown = "leaf";
    for (let i = 0; i < 8; i += 1) value = { next: value };
    const result = inferType(value, { maxDepth: 2 });
    expect(JSON.stringify(result)).toContain('"kind":"unknown"');
  });
});

describe("mergeTypes", () => {
  it("returns the informative side when one is unknown", () => {
    const object: InferredType = { kind: "object", properties: [] };
    expect(mergeTypes({ kind: "unknown" }, object)).toBe(object);
    expect(mergeTypes(object, { kind: "unknown" })).toBe(object);
  });

  it("deduplicates union members by shape", () => {
    const merged = mergeTypes(
      { kind: "string" },
      { kind: "union", options: [{ kind: "string" }, { kind: "boolean" }] },
    );
    expect(merged.kind).toBe("union");
    if (merged.kind !== "union") return;
    expect(merged.options).toHaveLength(2);
  });

  it("collapses a union of one remaining kind", () => {
    const merged = mergeTypes({ kind: "string" }, { kind: "string" });
    expect(merged).toEqual({ kind: "string" });
  });
});

describe("typeSignature", () => {
  it("distinguishes optional from required properties", () => {
    const required: InferredType = {
      kind: "object",
      properties: [{ name: "a", type: { kind: "string" }, optional: false }],
    };
    const optional: InferredType = {
      kind: "object",
      properties: [{ name: "a", type: { kind: "string" }, optional: true }],
    };
    expect(typeSignature(required)).not.toBe(typeSignature(optional));
  });

  it("sorts union members so member order does not matter", () => {
    const a: InferredType = {
      kind: "union",
      options: [{ kind: "string" }, { kind: "number" }],
    };
    const b: InferredType = {
      kind: "union",
      options: [{ kind: "number" }, { kind: "string" }],
    };
    expect(typeSignature(a)).toBe(typeSignature(b));
  });
});

describe("nameObjectTypes", () => {
  it("names nested objects from their path", () => {
    const root = inferType({
      address: { city: "London" },
      orders: [{ sku: "a" }],
    });
    const named = nameObjectTypes(root, "Root");
    expect(named.map((entry) => entry.name)).toEqual([
      "Root",
      "RootAddress",
      "RootOrdersItem",
    ]);
  });

  it("keeps a single object reference for each declaration", () => {
    const root = inferType({ a: { b: 1 }, c: { d: 2 } });
    const named = nameObjectTypes(root, "Root");
    expect(new Set(named.map((entry) => entry.name)).size).toBe(named.length);
  });

  it("disambiguates colliding names", () => {
    const root = inferType({ "user-name": { a: 1 }, userName: { b: 2 } });
    const named = nameObjectTypes(root, "Root");
    expect(named.map((entry) => entry.name)).toEqual(["Root", "RootUserName", "RootUserName2"]);
  });

  it("names the item type when the root is an array", () => {
    const named = nameObjectTypes(inferType([{ id: 1 }]), "Root");
    expect(named[0].name).toBe("RootItem");
  });
});

describe("identifier helpers", () => {
  it("converts awkward keys to PascalCase", () => {
    expect(toPascalCase("user_name")).toBe("UserName");
    expect(toPascalCase("user-name")).toBe("UserName");
    expect(toPascalCase("user name")).toBe("UserName");
    expect(toPascalCase("RootAddress")).toBe("RootAddress");
  });

  it("converts to camelCase", () => {
    expect(toCamelCase("RootAddress")).toBe("rootAddress");
    expect(toCamelCase("")).toBe("");
  });

  it("recognises valid identifiers", () => {
    expect(isValidIdentifier("id")).toBe(true);
    expect(isValidIdentifier("_private")).toBe(true);
    expect(isValidIdentifier("$ref")).toBe(true);
    expect(isValidIdentifier("2fa")).toBe(false);
    expect(isValidIdentifier("user-name")).toBe(false);
    expect(isValidIdentifier("user name")).toBe(false);
  });
});
