import { describe, expect, it } from "vitest";
import { inferType } from "./type-infer";
import { csharpType, emitCsharp, propertyName } from "./csharp-emit";

const OPTIONS = {
  rootName: "Order",
  attributes: true,
  indent: 4,
} as const;

describe("propertyName", () => {
  it("converts snake_case and kebab-case to PascalCase", () => {
    expect(propertyName("coupon_code")).toBe("CouponCode");
    expect(propertyName("unit-price")).toBe("UnitPrice");
    expect(propertyName("total")).toBe("Total");
  });

  it("prefixes names that start with a digit", () => {
    expect(propertyName("2fa_enabled")).toBe("Field2faEnabled");
  });
});

describe("csharpType", () => {
  const byShape = new Map();

  it("maps whole numbers to long and fractional ones to double", () => {
    expect(csharpType({ kind: "number", integer: true }, false, byShape)).toBe("long");
    expect(csharpType({ kind: "number", integer: false }, false, byShape)).toBe("double");
  });

  it("marks optional and null-holding value types nullable", () => {
    expect(csharpType({ kind: "number", integer: true }, true, byShape)).toBe("long?");

    const withNull = inferType([{ v: 1 }, { v: null }]);
    if (withNull.kind !== "array" || withNull.items.kind !== "object") {
      throw new Error("expected an array of objects");
    }
    expect(csharpType(withNull.items.properties[0].type, true, byShape)).toBe("long?");
  });

  it("keeps a nullable marker inside a list", () => {
    const type = inferType({ tags: ["a", null] });
    if (type.kind !== "object") throw new Error("expected object");
    expect(csharpType(type.properties[0].type, false, byShape)).toBe("List<string?>");
  });
});

describe("emitCsharp", () => {
  it("emits one top-level class per object with a file-scoped namespace", () => {
    const { code, typeCount } = emitCsharp(inferType({ address: { city: "London" } }), {
      ...OPTIONS,
      namespace: "MyApp.Models",
    });

    expect(typeCount).toBe(2);
    expect(code).toContain("namespace MyApp.Models;");
    expect(code).toContain("public class Order");
    expect(code).toContain("public class OrderAddress");
    expect(code).toContain("public OrderAddress Address { get; set; } = new();");
    // Flat, unlike the Java output: no class declaration sits at an indent.
    expect(code).not.toMatch(/^[ ]+public class/m);
  });

  it("annotates every key whose exact spelling differs, including case", () => {
    const { code } = emitCsharp(inferType({ coupon_code: "X", total: 1 }), OPTIONS);

    // System.Text.Json matches names case-sensitively by default, so `total`
    // against a `Total` property needs the annotation just as `coupon_code` does.
    expect(code).toContain('[JsonPropertyName("coupon_code")]');
    expect(code).toContain("public string CouponCode { get; set; } = string.Empty;");
    expect(code).toContain('[JsonPropertyName("total")]');
    expect(code).toContain("public long Total { get; set; }");
    expect(code).toContain("using System.Text.Json.Serialization;");
  });

  it("turns attributes off and drops the using", () => {
    const { code } = emitCsharp(inferType({ coupon_code: "X" }), {
      ...OPTIONS,
      attributes: false,
    });

    expect(code).not.toContain("JsonPropertyName");
    expect(code).not.toContain("using System.Text.Json.Serialization;");
  });

  it("initialises required reference members so the file is warning-free", () => {
    const { code } = emitCsharp(inferType({ name: "Ada", items: [{ sku: "KB" }] }), OPTIONS);

    expect(code).toContain("public string Name { get; set; } = string.Empty;");
    expect(code).toContain("public List<OrderItems> Items { get; set; } = new();");
  });

  it("enables nullable annotations only when a ? is actually emitted", () => {
    const withNull = emitCsharp(inferType([{ v: 1 }, { v: null }]), OPTIONS).code;
    expect(withNull).toContain("#nullable enable");
    expect(withNull).toContain("public long? V { get; set; }");

    const withoutNull = emitCsharp(inferType({ v: 1 }), OPTIONS).code;
    expect(withoutNull).not.toContain("#nullable enable");
  });

  it("widens mixed numbers and falls back to object for real mixes", () => {
    const numeric = emitCsharp(inferType([{ v: 1 }, { v: 2.5 }]), OPTIONS).code;
    expect(numeric).toContain("public double V { get; set; }");

    const mixed = emitCsharp(inferType([{ v: 1 }, { v: "x" }]), OPTIONS).code;
    expect(mixed).toContain("public object V { get; set; } = null!;");
  });

  it("names the element class after the root when the root is an array", () => {
    const { code, typeCount } = emitCsharp(inferType([{ id: 1 }, { id: 2 }]), OPTIONS);

    expect(typeCount).toBe(1);
    expect(code).toContain("// The JSON root is an array.");
    expect(code).toContain("List<Order>");
    expect(code).toContain("public class Order");
  });

  it("derives nested names from the root, not from the element path", () => {
    const { code } = emitCsharp(inferType([{ customer: { city: "Oslo" } }]), OPTIONS);

    expect(code).toContain("public OrderCustomer Customer { get; set; } = new();");
    expect(code).toContain("public class OrderCustomer");
    // The old walk produced OrderItemCustomer here.
    expect(code).not.toContain("OrderItemCustomer");
  });

  it("explains a primitive root instead of inventing a wrapper", () => {
    const { code, typeCount } = emitCsharp(inferType([1, 2, 3]), OPTIONS);

    expect(typeCount).toBe(0);
    expect(code).toContain("List<long>");
    expect(code).not.toContain("public class");
  });

  it("deduplicates keys that collapse onto the same C# name", () => {
    const { code } = emitCsharp(inferType({ user_id: 1, userId: 2 }), OPTIONS);

    expect(code).toContain("public long UserId { get; set; }");
    expect(code).toContain("public long UserId2 { get; set; }");
    expect(code).toContain('[JsonPropertyName("userId")]');
  });
});
