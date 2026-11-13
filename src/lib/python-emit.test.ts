import { describe, expect, it } from "vitest";
import { inferType } from "./type-infer";
import { emitPython, modelName, pythonName, pythonType, toSnakeCase } from "./python-emit";

const PYDANTIC = { target: "pydantic", rootName: "Order", aliases: true } as const;
const DATACLASS = { target: "dataclass", rootName: "Order", aliases: true } as const;

function objectOf(value: unknown) {
  const type = inferType(value);
  if (type.kind !== "object") throw new Error("expected an object");
  return type;
}

describe("toSnakeCase", () => {
  it("converts camelCase and acronym runs", () => {
    expect(toSnakeCase("orderId")).toBe("order_id");
    expect(toSnakeCase("orderID")).toBe("order_id");
    expect(toSnakeCase("APIKey")).toBe("api_key");
    expect(toSnakeCase("coupon_code")).toBe("coupon_code");
    expect(toSnakeCase("Unit Price")).toBe("unit_price");
    expect(toSnakeCase("HTTPServer")).toBe("http_server");
  });
});

describe("pythonName", () => {
  it("escapes keywords with a trailing underscore", () => {
    expect(pythonName("class", new Set())).toBe("class_");
    expect(pythonName("from", new Set())).toBe("from_");
    expect(pythonName("in", new Set())).toBe("in_");
    // `None` lowercases to `none`, which is not a keyword, so it stays.
    expect(pythonName("None", new Set())).toBe("none");
  });

  it("escapes names the model base already owns", () => {
    expect(pythonName("self", new Set())).toBe("self_");
    expect(pythonName("model_config", new Set())).toBe("model_config_");
  });

  it("prefixes names that would start with a digit and dedupes", () => {
    const used = new Set<string>();
    expect(pythonName("2fa_enabled", used)).toBe("field_2fa_enabled");
    expect(pythonName("order id", used)).toBe("order_id");
    expect(pythonName("order-id", used)).toBe("order_id_2");
  });

  it("falls back for names with no usable characters", () => {
    expect(pythonName("!!!", new Set())).toBe("value");
  });
});

describe("modelName", () => {
  it("turns free text into a valid class name", () => {
    expect(modelName("my order")).toBe("MyOrder");
    expect(modelName("2fa")).toBe("Model2fa");
    expect(modelName("   ")).toBe("Root");
  });
});

describe("pythonType", () => {
  const byShape = new Map();

  it("keeps integers and fractions apart", () => {
    expect(pythonType({ kind: "number", integer: true }, byShape)).toBe("int");
    expect(pythonType({ kind: "number", integer: false }, byShape)).toBe("float");
  });

  it("widens a mix of int and float to float", () => {
    const type = inferType([1, 2.5]);
    if (type.kind !== "array") throw new Error("expected array");
    expect(pythonType(type.items, byShape)).toBe("float");
  });

  it("renders arrays with the builtin generic", () => {
    expect(pythonType({ kind: "array", items: { kind: "string" } }, byShape)).toBe("list[str]");
  });

  it("renders a genuine mix as a Union", () => {
    const type = inferType(["a", true]);
    if (type.kind !== "array") throw new Error("expected array");
    expect(pythonType(type.items, byShape)).toBe("Union[str, bool]");
  });
});

describe("emitPython — Pydantic", () => {
  it("emits a BaseModel with snake_case fields and an alias for the wire name", () => {
    const { code, classCount } = emitPython(objectOf({ orderId: 1, full_name: "Ada" }), PYDANTIC);

    expect(classCount).toBe(1);
    expect(code).toContain("from pydantic import BaseModel, ConfigDict, Field");
    expect(code).toContain("class Order(BaseModel):");
    expect(code).toContain("    order_id: int = Field(alias=\"orderId\")");
    expect(code).toContain("    full_name: str");
    expect(code).toContain("model_config = ConfigDict(populate_by_name=True)");
    expect(code).not.toContain("Optional");
  });

  it("omits ConfigDict and Field when no name needs an alias", () => {
    const { code } = emitPython(objectOf({ id: 1, full_name: "Ada" }), PYDANTIC);
    expect(code).toContain("from pydantic import BaseModel\n");
    expect(code).not.toContain("ConfigDict");
    expect(code).not.toContain("Field(");
  });

  it("marks missing keys Optional with a None default", () => {
    const { code } = emitPython(inferType([{ id: 1 }, { id: 2, note: "x" }]), PYDANTIC);
    expect(code).toContain("    note: Optional[str] = None");
    expect(code).toContain("from typing import Optional");
  });

  it("keeps a required key that held null as Optional without a default", () => {
    const { code } = emitPython(objectOf({ coupon: null }), PYDANTIC);
    expect(code).toContain("    coupon: Optional[Any]");
    expect(code).not.toContain("coupon: Optional[Any] = None");
  });

  it("defines nested models before the parent that references them", () => {
    const { code } = emitPython(objectOf({ id: 1, address: { city: "London" } }), PYDANTIC);
    expect(code.indexOf("class OrderAddress")).toBeLessThan(code.indexOf("class Order(BaseModel)"));

    const declaration = code.indexOf("class OrderAddress");
    const reference = code.indexOf("address: OrderAddress");
    expect(declaration).toBeGreaterThan(-1);
    expect(reference).toBeGreaterThan(declaration);
  });

  it("escapes a keyword key and still maps it back with an alias", () => {
    const { code } = emitPython(objectOf({ class: "premium", from: "web" }), PYDANTIC);
    expect(code).toContain("class_: str = Field(alias=\"class\")");
    expect(code).toContain("from_: str = Field(alias=\"from\")");
  });

  it("separates top-level classes with two blank lines", () => {
    const { code } = emitPython(objectOf({ address: { city: "London" } }), PYDANTIC);
    expect(code).toMatch(/str\n\n\nclass Order/);
  });
});

describe("emitPython — dataclasses", () => {
  it("emits a decorated class with no base", () => {
    const { code } = emitPython(objectOf({ id: 1 }), DATACLASS);
    expect(code).toContain("from dataclasses import dataclass");
    expect(code).toContain("@dataclass\nclass Order:");
    expect(code).not.toContain("BaseModel");
  });

  it("moves optional fields below required ones, keeping their order", () => {
    const { code } = emitPython(
      inferType([{ a: 1, b: "x", c: true }, { a: 2, c: true }]),
      DATACLASS,
    );
    const a = code.indexOf("a: int");
    const c = code.indexOf("c: bool");
    const b = code.indexOf("b: Optional[str] = None");
    expect(a).toBeGreaterThan(-1);
    expect(a).toBeLessThan(c);
    expect(c).toBeLessThan(b);
  });

  it("annotates renamed fields with the original key in a comment", () => {
    const { code } = emitPython(objectOf({ orderId: 1 }), DATACLASS);
    expect(code).toContain("order_id: int  # JSON: orderId");
  });

  it("omits the renaming note when aliases are turned off", () => {
    const { code } = emitPython(objectOf({ orderId: 1 }), { ...DATACLASS, aliases: false });
    expect(code).toContain("order_id: int");
    expect(code).not.toContain("# JSON:");
  });

  it("emits pass for an object with no keys", () => {
    const { code } = emitPython(objectOf({ empty: {} }), DATACLASS);
    expect(code).toContain("@dataclass\nclass OrderEmpty:\n    pass");
  });
});

describe("emitPython — roots that are not objects", () => {
  it("models an array element and says how to hold the list", () => {
    const { code, classCount } = emitPython(inferType([{ id: 1 }]), PYDANTIC);
    expect(classCount).toBe(1);
    expect(code).toContain("# The JSON root is an array");
    expect(code).toContain("class Order(BaseModel):");
  });

  it("declines to invent a wrapper for a primitive root", () => {
    const { code, classCount } = emitPython(inferType(42), PYDANTIC);
    expect(classCount).toBe(0);
    expect(code).toContain("needs no model");
    expect(code).toContain("value: int");
  });

  it("derives nested class names from the root when the root is an array", () => {
    const { code } = emitPython(inferType([{ customer: { name: "Ada" } }]), PYDANTIC);
    expect(code).toContain("class OrderCustomer(BaseModel):");
    expect(code).not.toContain("OrderItemCustomer");
  });
});
