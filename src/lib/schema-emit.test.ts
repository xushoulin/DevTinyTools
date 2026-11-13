import { describe, expect, it } from "vitest";
import { inferType } from "./type-infer";
import { emitJsonSchema, emitOpenApi } from "./schema-emit";

describe("emitJsonSchema", () => {
  it("inlines the root object and lists required keys", () => {
    const { code, typeCount } = emitJsonSchema(inferType({ id: 1, name: "Ada" }), {
      rootName: "User",
    });
    const schema = JSON.parse(code);

    expect(typeCount).toBe(1);
    expect(schema.$schema).toContain("2020-12");
    expect(schema.title).toBe("User");
    expect(schema.type).toBe("object");
    expect(schema.properties.id).toEqual({ type: "integer" });
    expect(schema.properties.name).toEqual({ type: "string" });
    expect(schema.required).toEqual(["id", "name"]);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.$defs).toBeUndefined();
  });

  it("leaves keys missing from some samples out of required", () => {
    const { code } = emitJsonSchema(inferType([{ id: 1, name: "Ada" }, { id: 2 }]), {
      rootName: "Row",
    });
    const schema = JSON.parse(code);

    expect(schema.type).toBe("array");
    expect(schema.$defs.RowItem.required).toEqual(["id"]);
    expect(schema.$defs.RowItem.properties.name).toEqual({ type: "string" });
  });

  it("puts nested objects into $defs and references them", () => {
    const { code, typeCount } = emitJsonSchema(
      inferType({ address: { city: "London" } }),
      { rootName: "Root" },
    );
    const schema = JSON.parse(code);

    expect(typeCount).toBe(2);
    expect(schema.properties.address).toEqual({ $ref: "#/$defs/RootAddress" });
    expect(schema.$defs.RootAddress).toMatchObject({
      type: "object",
      properties: { city: { type: "string" } },
      additionalProperties: false,
    });
  });

  it("widens integer to number when a fractional sample appears", () => {
    const schema = JSON.parse(
      emitJsonSchema(inferType([{ price: 4 }, { price: 19.5 }]), { rootName: "Row" }).code,
    );

    expect(schema.$defs.RowItem.properties.price).toEqual({ type: "number" });

    const allWhole = JSON.parse(
      emitJsonSchema(inferType([{ price: 4 }, { price: 5 }]), { rootName: "Row" }).code,
    );
    expect(allWhole.$defs.RowItem.properties.price).toEqual({ type: "integer" });
  });

  it("collapses primitive unions into a type array including null", () => {
    const schema = JSON.parse(
      emitJsonSchema(inferType([{ v: "x" }, { v: 1 }, { v: null }]), { rootName: "Row" }).code,
    );

    expect(schema.$defs.RowItem.properties.v).toEqual({
      type: ["string", "number", "null"],
    });
  });

  it("uses anyOf when a union involves an object", () => {
    const schema = JSON.parse(
      emitJsonSchema(inferType([{ v: { a: 1 } }, { v: "x" }]), { rootName: "Row" }).code,
    );

    expect(schema.$defs.RowItem.properties.v.anyOf).toBeDefined();
  });

  it("renders arrays with typed items and handles the empty array", () => {
    const schema = JSON.parse(
      emitJsonSchema(inferType({ tags: ["a", "b"], empty: [] }), { rootName: "Root" }).code,
    );

    expect(schema.properties.tags).toEqual({ type: "array", items: { type: "string" } });
    expect(schema.properties.empty).toEqual({ type: "array", items: {} });
  });

  it("renders an empty schema for unknown", () => {
    const schema = JSON.parse(
      emitJsonSchema(inferType({ v: null }), { rootName: "Row" }).code,
    );

    // null infers to { kind: "null" }; unknown only comes from depth caps.
    expect(schema.properties.v).toEqual({ type: "null" });

    const any = JSON.parse(
      emitJsonSchema({ kind: "unknown" }, { rootName: "Row" }).code,
    );
    expect(any).toEqual({ $schema: expect.any(String), title: "Row" });
  });

  it("drops additionalProperties when strict mode is off", () => {
    const schema = JSON.parse(
      emitJsonSchema(inferType({ id: 1 }), {
        rootName: "User",
        additionalProperties: false,
      }).code,
    );

    expect(schema.additionalProperties).toBeUndefined();
  });

  it("describes a root that is not an object", () => {
    const schema = JSON.parse(
      emitJsonSchema(inferType([{ sku: "J-01" }]), { rootName: "Items" }).code,
    );

    expect(schema.type).toBe("array");
    expect(schema.items).toEqual({ $ref: "#/$defs/ItemsItem" });
    expect(schema.$defs.ItemsItem.required).toEqual(["sku"]);
  });
});

describe("emitOpenApi", () => {
  it("wraps every named object in components.schemas", () => {
    const { code, typeCount } = emitOpenApi(inferType({ address: { city: "London" } }), {
      rootName: "User",
    });
    const doc = JSON.parse(code);

    expect(typeCount).toBe(2);
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.jsonSchemaDialect).toContain("2020-12");
    expect(doc.info.title).toBe("User API");
    expect(doc.components.schemas.User.properties.address).toEqual({
      $ref: "#/components/schemas/UserAddress",
    });
    expect(doc.components.schemas.UserAddress.required).toEqual(["city"]);
  });

  it("respects a custom title and strict mode", () => {
    const doc = JSON.parse(
      emitOpenApi(inferType({ id: 1 }), {
        rootName: "Order",
        apiTitle: "Orders Webhooks",
        additionalProperties: false,
      }).code,
    );

    expect(doc.info.title).toBe("Orders Webhooks");
    expect(doc.components.schemas.Order.additionalProperties).toBeUndefined();
  });

  it("puts a primitive root into schemas so it is referencable", () => {
    const doc = JSON.parse(
      emitOpenApi(inferType(["a", "b"]), { rootName: "Tags" }).code,
    );

    expect(doc.components.schemas.Tags).toEqual({ type: "array", items: { type: "string" } });
  });
});
