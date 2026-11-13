import { describe, expect, it } from "vitest";
import { emitJava, fieldName, javaType } from "./java-emit";
import { inferType } from "./type-infer";

const OPTIONS = {
  rootName: "Order",
  jackson: true,
  accessors: true,
  indent: 2,
} as const;

describe("fieldName", () => {
  it("camelCases snake_case and kebab-case keys", () => {
    expect(fieldName("coupon_code")).toBe("couponCode");
    expect(fieldName("api-url")).toBe("apiUrl");
    expect(fieldName("id")).toBe("id");
    expect(fieldName("displayName")).toBe("displayName");
  });

  it("prefixes keys that would start with a digit", () => {
    expect(fieldName("2fa_enabled")).toBe("field2faEnabled");
  });
});

describe("javaType", () => {
  const byShape = new Map<never, string>();

  it("uses primitives when boxing is not required", () => {
    expect(javaType({ kind: "number", integer: true }, false, byShape)).toBe("long");
    expect(javaType({ kind: "number", integer: false }, false, byShape)).toBe("double");
    expect(javaType({ kind: "boolean" }, false, byShape)).toBe("boolean");
  });

  it("boxes on request", () => {
    expect(javaType({ kind: "number", integer: true }, true, byShape)).toBe("Long");
    expect(javaType({ kind: "boolean" }, true, byShape)).toBe("Boolean");
  });

  it("boxes every generic argument", () => {
    expect(javaType({ kind: "array", items: { kind: "number", integer: true } }, false, byShape)).toBe(
      "List<Long>",
    );
  });

  it("widens a numeric union to Double and a mixed union to Object", () => {
    expect(
      javaType(
        { kind: "union", options: [{ kind: "number", integer: true }, { kind: "null" }] },
        true,
        byShape,
      ),
    ).toBe("Long");
    expect(
      javaType(
        { kind: "union", options: [{ kind: "string" }, { kind: "number" }] },
        true,
        byShape,
      ),
    ).toBe("Object");
  });
});

describe("emitJava", () => {
  it("emits a class with private fields and accessors", () => {
    const { code, typeCount } = emitJava(inferType({ id: 7, nickname: "Ada" }), OPTIONS);

    expect(typeCount).toBe(1);
    expect(code).toContain("public class Order {");
    expect(code).toContain("  private long id;");
    expect(code).toContain("  private String nickname;");
    expect(code).toContain("public long getId() { return id; }");
    expect(code).toContain("public void setId(long id) { this.id = id; }");
  });

  it("boxes a field that is missing from some samples", () => {
    const { code } = emitJava(
      inferType([{ id: 1, total: 19.5 }, { id: 2 }]),
      OPTIONS,
    );

    expect(code).toContain("private long id;");
    // Missing in the second sample: a primitive could not express that.
    expect(code).toContain("private Double total;");
  });

  it("boxes a field whose value is null", () => {
    const { code } = emitJava(inferType({ coupon: null, count: 3 }), OPTIONS);

    expect(code).toContain("private Object coupon;");
    expect(code).toContain("private long count;");
  });

  it("annotates renamed fields with the original JSON key", () => {
    const { code } = emitJava(inferType({ coupon_code: "X" }), OPTIONS);

    expect(code).toContain('@JsonProperty("coupon_code")');
    expect(code).toContain("private String couponCode;");
    expect(code).toContain("import com.fasterxml.jackson.annotation.JsonProperty;");
  });

  it("falls back to a comment when Jackson is off", () => {
    const { code } = emitJava(inferType({ coupon_code: "X" }), { ...OPTIONS, jackson: false });

    expect(code).not.toContain("@JsonProperty");
    expect(code).toContain("private String couponCode; // json: coupon_code");
  });

  it("nests child classes inside the root so one file compiles", () => {
    const { code, typeCount } = emitJava(
      inferType({ id: 1, customer: { name: "Ada" }, items: [{ sku: "KB-01" }] }),
      OPTIONS,
    );

    expect(typeCount).toBe(3);
    expect(code).toContain("public static class OrderCustomer {");
    expect(code).toContain("public static class OrderItems {");
    expect(code).toContain("private OrderCustomer customer;");
    expect(code).toContain("private List<OrderItems> items;");
    expect(code).toContain("import java.util.List;");
    // Nested classes close one level deeper than the root.
    expect(code.split("\n").filter((line) => line === "  }").length).toBe(2);
  });

  it("names the element class after the root when the root is an array", () => {
    const { code, typeCount } = emitJava(inferType([{ id: 1 }, { id: 2 }]), OPTIONS);

    expect(typeCount).toBe(1);
    expect(code).toContain("// The JSON root is an array");
    expect(code).toContain("public class Order {");
    expect(code).toContain("private long id;");
  });

  it("explains itself instead of inventing a wrapper for a primitive root", () => {
    const { code, typeCount } = emitJava(inferType(["a", "b"]), OPTIONS);

    expect(typeCount).toBe(0);
    expect(code).toContain("List<String>");
  });

  it("writes a package declaration when given one", () => {
    const { code } = emitJava(inferType({ id: 1 }), {
      ...OPTIONS,
      packageName: "com.example.model",
    });

    expect(code.startsWith("package com.example.model;")).toBe(true);
  });

  it("omits accessors on request", () => {
    const { code } = emitJava(inferType({ id: 1 }), { ...OPTIONS, accessors: false });

    expect(code).not.toContain("getId()");
    expect(code).toContain("private long id;");
  });
});
