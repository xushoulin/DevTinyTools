/**
 * Batch conversion pipeline for the JSON to TypeScript tool.
 *
 * Pure and testable on purpose: everything except reading the files off disk
 * happens here. One file that fails to parse must not block the others — the
 * result list carries the reason instead, and the UI turns the whole set into
 * a ZIP.
 */

import { formatCount, parseJson } from "./json-utils";
import { emitJsonSchema, emitOpenApi } from "./schema-emit";
import { inferType, toPascalCase } from "./type-infer";
import { emitTypeScript, emitZod } from "./type-emit";

export type BatchTarget = "typescript" | "zod" | "json-schema" | "openapi";

export const BATCH_TARGET_SUFFIX: Record<BatchTarget, string> = {
  typescript: ".ts",
  zod: ".schema.ts",
  "json-schema": ".schema.json",
  openapi: ".openapi.json",
};

export interface BatchSourceFile {
  /** The file's original name, e.g. `orders.json`. */
  name: string;
  /** File content, or null when the FileReader refused it. */
  text: string | null;
}

export interface BatchFileResult {
  sourceFile: string;
  /** Output file name inside the archive, derived from the source file. */
  filename: string;
  ok: boolean;
  code?: string;
  typeCount?: number;
  lineCount?: number;
  /** Why the file produced no output, when ok is false. */
  detail?: string;
}

export interface BatchOptions {
  target: BatchTarget;
  indent: 2 | 4;
  /** Maximum characters per input document (the tier's cap). */
  charLimit: number;
}

/** `orders.json` → `orders`, `!!!.json` → `document`. */
function outputBase(sourceName: string): string {
  const cleaned = sourceName
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-._]+/, "")
    .replace(/[-._]+$/, "")
    .toLowerCase();
  return cleaned || "document";
}

function emitFor(
  target: BatchTarget,
  inferred: ReturnType<typeof inferType>,
  rootName: string,
  indent: 2 | 4,
): { code: string; typeCount: number; lineCount: number } {
  const options = { rootName, indent };
  switch (target) {
    case "zod":
      return emitZod(inferred, options);
    case "json-schema":
      return emitJsonSchema(inferred, options);
    case "openapi":
      return emitOpenApi(inferred, options);
    default:
      return emitTypeScript(inferred, options);
  }
}

/**
 * Convert every source file to the chosen target. Names are unique across the
 * batch (`a.json` and `a.txt` would both claim `a.ts`, so the second becomes
 * `a-2.ts`), and failures carry a human-readable reason.
 */
export function convertBatchFiles(
  files: BatchSourceFile[],
  options: BatchOptions,
): BatchFileResult[] {
  const usedNames = new Set<string>();

  return files.map((file) => {
    const base = outputBase(file.name);
    let filename = `${base}${BATCH_TARGET_SUFFIX[options.target]}`;
    let suffix = 2;
    while (usedNames.has(filename)) {
      filename = `${base}-${suffix}${BATCH_TARGET_SUFFIX[options.target]}`;
      suffix++;
    }
    usedNames.add(filename);

    if (file.text === null) {
      return { sourceFile: file.name, filename, ok: false, detail: "The file could not be read." };
    }
    if (file.text.length > options.charLimit) {
      return {
        sourceFile: file.name,
        filename,
        ok: false,
        detail: `${formatCount(file.text.length)} characters — over the ${formatCount(options.charLimit)} limit.`,
      };
    }

    const parsed = parseJson(file.text);
    if (!parsed.ok) {
      return {
        sourceFile: file.name,
        filename,
        ok: false,
        detail: `Not valid JSON: ${parsed.error.message}`,
      };
    }

    // `orders.json` → root type `Orders`, so the declarations read naturally.
    const rootName = toPascalCase(base) || "Root";
    const emitted = emitFor(options.target, inferType(parsed.value), rootName, options.indent);

    return {
      sourceFile: file.name,
      filename,
      ok: true,
      code: emitted.code,
      typeCount: emitted.typeCount,
      lineCount: emitted.lineCount,
    };
  });
}
