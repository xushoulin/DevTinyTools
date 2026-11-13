import { describe, expect, it } from "vitest";
import { convertBatchFiles } from "./batch-convert";

const OPTIONS = { target: "typescript" as const, indent: 2 as const, charLimit: 1_000_000 };

describe("convertBatchFiles", () => {
  it("names outputs after the source file and derives the root type", () => {
    const [result] = convertBatchFiles(
      [{ name: "orders.json", text: '[{"id": 1, "total": 19.5}, {"id": 2}]' }],
      OPTIONS,
    );

    expect(result.ok).toBe(true);
    expect(result.filename).toBe("orders.ts");
    expect(result.typeCount).toBeGreaterThan(0);
    // Second element has no `total`, so it must be optional, and 19.5 widens
    // the number slot: the whole point of batch over copy-paste.
    expect(result.code).toContain("export interface OrdersItem {");
    expect(result.code).toContain("export type Orders = OrdersItem[];");
    expect(result.code).toContain("id: number;");
    expect(result.code).toContain("total?: number;");
  });

  it("picks the suffix per target", () => {
    const files = [{ name: "profile.json", text: '{"userId": 7}' }];

    expect(convertBatchFiles(files, { ...OPTIONS, target: "zod" })[0].filename).toBe(
      "profile.schema.ts",
    );
    expect(convertBatchFiles(files, { ...OPTIONS, target: "json-schema" })[0].filename).toBe(
      "profile.schema.json",
    );
    expect(convertBatchFiles(files, { ...OPTIONS, target: "openapi" })[0].filename).toBe(
      "profile.openapi.json",
    );
    expect(convertBatchFiles(files, { ...OPTIONS, target: "openapi" })[0].code).toContain(
      '"Profile"',
    );
  });

  it("does not let one broken file block the others", () => {
    const results = convertBatchFiles(
      [
        { name: "broken.json", text: '{"broken": [1,}' },
        { name: "good.json", text: '{"ok": true}' },
      ],
      OPTIONS,
    );

    expect(results[0].ok).toBe(false);
    expect(results[0].detail).toContain("Not valid JSON");
    expect(results[1].ok).toBe(true);
    expect(results[1].filename).toBe("good.ts");
    expect(results[1].code).toContain("export interface Good {");
  });

  it("reports unreadable and oversized files without throwing", () => {
    const results = convertBatchFiles(
      [
        { name: "unreadable.json", text: null },
        { name: "huge.json", text: "x".repeat(11) },
        { name: "fine.json", text: "1" },
      ],
      { ...OPTIONS, charLimit: 10 },
    );

    expect(results[0].ok).toBe(false);
    expect(results[0].detail).toContain("could not be read");
    expect(results[1].ok).toBe(false);
    expect(results[1].detail).toContain("over the 10 limit");
    expect(results[2].ok).toBe(true);
    expect(results[2].filename).toBe("fine.ts");
  });

  it("keeps output names unique when sources collapse to the same base", () => {
    const results = convertBatchFiles(
      [
        { name: "a.json", text: '{"n": 1}' },
        { name: "a.txt", text: '{"n": 2}' },
      ],
      OPTIONS,
    );

    expect(results[0].filename).toBe("a.ts");
    expect(results[1].filename).toBe("a-2.ts");
  });

  it("falls back to a safe base for names with no usable characters", () => {
    const [result] = convertBatchFiles([{ name: "!!!.json", text: '{"n": 1}' }], OPTIONS);

    expect(result.filename).toBe("document.ts");
    expect(result.code).toContain("export interface Document {");
  });
});
