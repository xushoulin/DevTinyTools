import { describe, expect, it } from "vitest";
import { inferType } from "./type-infer";
import { emitTypeScript, emitZod } from "./type-emit";

describe("emitTypeScript", () => {
  it("emits one interface for a flat object", () => {
    const { code, typeCount } = emitTypeScript(inferType({ id: 1, name: "Ada" }), {
      rootName: "User",
    });

    expect(typeCount).toBe(1);
    expect(code).toBe(
      ["export interface User {", "  id: number;", "  name: string;", "}", ""].join("\n"),
    );
  });

  it("marks properties that only some samples carry as optional", () => {
    const { code } = emitTypeScript(
      inferType([{ id: 1, name: "Ada" }, { id: 2 }]),
      { rootName: "Row" },
    );

    expect(code).toContain("name?: string;");
    expect(code).toContain("id: number;");
    expect(code).not.toContain("id?:");
  });

  it("hoists nested objects into their own interface and references them", () => {
    const { code, typeCount } = emitTypeScript(
      inferType({ address: { city: "London" } }),
      { rootName: "Root" },
    );

    expect(typeCount).toBe(2);
    expect(code).toContain("interface Root {");
    expect(code).toContain("address: RootAddress;");
    expect(code).toContain("interface RootAddress {");
    expect(code).toContain("city: string;");
  });

  it("quotes keys that are not valid identifiers", () => {
    const { code } = emitTypeScript(inferType({ "user-name": "Ada", "2fa": true }), {
      rootName: "Root",
    });

    expect(code).toContain('"user-name": string;');
    expect(code).toContain('"2fa": boolean;');
  });

  it("brackets unions before the array suffix", () => {
    const { code } = emitTypeScript(inferType({ mixed: [1, "two"] }), { rootName: "Root" });
    expect(code).toContain("mixed: (number | string)[];");
  });

  it("writes a type alias when the root is an array", () => {
    const { code, typeCount } = emitTypeScript(inferType([{ id: 1 }]), { rootName: "Root" });

    expect(typeCount).toBe(2);
    expect(code).toContain("interface RootItem {");
    expect(code).toContain("type Root = RootItem[];");
  });

  it("writes a type alias for a primitive root", () => {
    const { code } = emitTypeScript(inferType("hello"), { rootName: "Root" });
    expect(code.trim()).toBe("export type Root = string;");
  });

  it("omits the export keyword when asked", () => {
    const { code } = emitTypeScript(inferType({ id: 1 }), {
      rootName: "Root",
      exportKeyword: false,
    });
    expect(code.startsWith("interface Root {")).toBe(true);
  });

  it("honours a four-space indent", () => {
    const { code } = emitTypeScript(inferType({ id: 1 }), { rootName: "Root", indent: 4 });
    expect(code).toContain("    id: number;");
  });

  it("still emits valid code for an empty object", () => {
    const { code } = emitTypeScript(inferType({}), { rootName: "Root" });
    expect(code).toContain("export interface Root {}");
  });

  it("normalises an awkward root name", () => {
    const { code } = emitTypeScript(inferType({ id: 1 }), { rootName: "api response" });
    expect(code).toContain("interface ApiResponse {");
  });
});

describe("emitZod", () => {
  it("imports zod and derives the root type", () => {
    const { code } = emitZod(inferType({ id: 1, name: "Ada" }), { rootName: "User" });

    expect(code.startsWith('import { z } from "zod";')).toBe(true);
    expect(code).toContain("export const userSchema = z.object({");
    expect(code).toContain("id: z.number(),");
    expect(code).toContain("export type User = z.infer<typeof userSchema>;");
  });

  it("declares nested schemas before the parent that references them", () => {
    const { code } = emitZod(inferType({ customer: { address: { city: "London" } } }), {
      rootName: "Root",
    });

    const addressIndex = code.indexOf("rootCustomerAddressSchema =");
    const customerIndex = code.indexOf("rootCustomerSchema =");
    const rootIndex = code.indexOf("rootSchema =");

    expect(addressIndex).toBeGreaterThan(-1);
    expect(addressIndex).toBeLessThan(customerIndex);
    expect(customerIndex).toBeLessThan(rootIndex);
  });

  it("uses .optional() for keys missing from some samples", () => {
    const { code } = emitZod(inferType([{ id: 1, name: "Ada" }, { id: 2 }]), {
      rootName: "Row",
    });
    expect(code).toContain("name: z.string().optional(),");
  });

  it("uses .nullable() for null unions", () => {
    const { code } = emitZod(inferType({ note: null }), { rootName: "Root" });
    expect(code).toContain("note: z.null(),");
  });

  it("wraps arrays in z.array", () => {
    const { code } = emitZod(inferType({ tags: ["a"] }), { rootName: "Root" });
    expect(code).toContain("tags: z.array(z.string()),");
  });

  it("handles an array of objects at the root", () => {
    const { code } = emitZod(inferType([{ id: 1 }, { id: 2 }]), { rootName: "Root" });
    expect(code).toContain("rootItemSchema = z.object({");
    expect(code).toContain("rootSchema = z.array(rootItemSchema);");
  });

  it("handles a union of objects with null as nullable union", () => {
    const { code } = emitZod(
      inferType({ value: [{ a: 1 }, null] }),
      { rootName: "Root" },
    );
    expect(code).toContain(".nullable()");
  });
});
