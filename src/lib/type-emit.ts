/**
 * Emit TypeScript interfaces or Zod schemas from an inferred shape.
 *
 * Both emitters share one traversal so the two outputs never drift: if a key
 * comes out optional in the interfaces it also comes out `.optional()` in the
 * schema. Nested objects are hoisted into their own named declaration and
 * referenced by name, which is what keeps a deeply nested payload readable.
 */

import {
  isValidIdentifier,
  nameObjectTypes,
  toPascalCase,
  type InferredType,
  type NamedType,
} from "./type-infer";

export type EmitTarget = "typescript" | "zod";

export interface EmitOptions {
  /** Name of the root type. Normalised to PascalCase. */
  rootName?: string;
  /** Prefix declarations with `export`. */
  exportKeyword?: boolean;
  /** Spaces per nesting level. */
  indent?: 2 | 4;
}

interface EmitContext {
  indentUnit: string;
  exportPrefix: string;
  named: NamedType[];
  byShape: Map<InferredType, NamedType>;
}

export interface EmitResult {
  code: string;
  /** Number of named object declarations, including the root. */
  typeCount: number;
  lineCount: number;
}

/** TypeScript interfaces (or a type alias when the root is not an object). */
export function emitTypeScript(root: InferredType, options: EmitOptions = {}): EmitResult {
  const context = buildContext(root, options);
  const rootTypeName = normaliseRootName(options.rootName);
  const blocks: string[] = [];

  for (const named of context.named) {
    blocks.push(`interface ${named.name} ${renderObjectBody(named.shape, context, 0)}`);
  }

  if (root.kind !== "object") {
    blocks.push(`type ${rootTypeName} = ${renderType(root, context, 0)};`);
  }

  const code = blocks
    .map((block) => (context.exportPrefix ? `${context.exportPrefix} ${block}` : block))
    .join("\n\n");

  return {
    code: `${code}\n`,
    typeCount: context.named.length + (root.kind === "object" ? 0 : 1),
    lineCount: countLines(code),
  };
}

/** Zod schema plus an inferred type alias for the root. */
export function emitZod(root: InferredType, options: EmitOptions = {}): EmitResult {
  const context = buildContext(root, options);
  const rootTypeName = normaliseRootName(options.rootName);
  const schemaName = `${toCamelCaseName(rootTypeName)}Schema`;

  // Zod declarations are `const`, so a reference must be declared before use.
  // Reversing the first-appearance order puts children before their parents;
  // the root is emitted last on purpose: its body points at the nested schemas.
  const nested = context.named
    .filter((named) => !isRootShape(root, named))
    .reverse();
  const rootNamed = context.named.find((named) => isRootShape(root, named));

  const blocks: string[] = ['import { z } from "zod";'];

  for (const named of nested) {
    blocks.push(
      `${context.exportPrefix} const ${named.identifier}Schema = ${renderZodObject(named.shape, context, 0)};`,
    );
  }

  if (rootNamed) {
    blocks.push(
      `${context.exportPrefix} const ${schemaName} = ${renderZodObject(rootNamed.shape, context, 0)};`,
    );
    blocks.push(`${context.exportPrefix} type ${rootTypeName} = z.infer<typeof ${schemaName}>;`);
  } else {
    blocks.push(`${context.exportPrefix} const ${schemaName} = ${renderZod(root, context, 0)};`);
    blocks.push(`${context.exportPrefix} type ${rootTypeName} = z.infer<typeof ${schemaName}>;`);
  }

  const code = blocks.join("\n\n");
  return {
    code: `${code}\n`,
    typeCount: context.named.length,
    lineCount: countLines(code),
  };
}

function isRootShape(root: InferredType, named: NamedType): boolean {
  return (root as InferredType) === (named.shape as InferredType);
}

function buildContext(root: InferredType, options: EmitOptions): EmitContext {
  const named = nameObjectTypes(root, normaliseRootName(options.rootName));
  const byShape = new Map<InferredType, NamedType>();
  for (const entry of named) {
    byShape.set(entry.shape as InferredType, entry);
  }

  return {
    indentUnit: " ".repeat(options.indent ?? 2),
    exportPrefix: options.exportKeyword === false ? "" : "export",
    named,
    byShape,
  };
}

function normaliseRootName(input?: string): string {
  const cleaned = toPascalCase((input ?? "").trim());
  return cleaned || "Root";
}

function toCamelCaseName(input: string): string {
  if (!input) return "";
  return input.charAt(0).toLowerCase() + input.slice(1);
}

function pad(context: EmitContext, level: number): string {
  return context.indentUnit.repeat(level);
}

/* ------------------------------------------------------------------ *
 * TypeScript
 * ------------------------------------------------------------------ */

function renderType(type: InferredType, context: EmitContext, level: number): string {
  switch (type.kind) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    case "unknown":
      return "unknown";
    case "object": {
      const named = context.byShape.get(type);
      if (named) return named.name;
      return renderObjectBody(type, context, level);
    }
    case "array": {
      const items = renderType(type.items, context, level);
      // `string | number` needs brackets before `[]`, `string[]` does not.
      const needsParens = type.items.kind === "union";
      return needsParens ? `(${items})[]` : `${items}[]`;
    }
    case "union": {
      const members = type.options.map((option) => renderType(option, context, level));
      return members.join(" | ");
    }
  }
}

function renderObjectBody(
  shape: InferredType & { kind: "object" },
  context: EmitContext,
  level: number,
): string {
  if (shape.properties.length === 0) return "{}";

  const inner = pad(context, level + 1);
  const lines = shape.properties.map((property) => {
    const key = isValidIdentifier(property.name) ? property.name : JSON.stringify(property.name);
    const optional = property.optional ? "?" : "";
    return `${inner}${key}${optional}: ${renderType(property.type, context, level + 1)};`;
  });

  return `{\n${lines.join("\n")}\n${pad(context, level)}}`;
}

/* ------------------------------------------------------------------ *
 * Zod
 * ------------------------------------------------------------------ */

function renderZod(type: InferredType, context: EmitContext, level: number): string {
  switch (type.kind) {
    case "string":
      return "z.string()";
    case "number":
      return "z.number()";
    case "boolean":
      return "z.boolean()";
    case "null":
      return "z.null()";
    case "unknown":
      return "z.unknown()";
    case "object": {
      const named = context.byShape.get(type);
      if (named) {
        // The root's own schema is being defined below; refer to it only when
        // the object is nested (the root never appears inside itself).
        return `${named.identifier}Schema`;
      }
      return renderZodObject(type, context, level);
    }
    case "array":
      return `z.array(${renderZod(type.items, context, level)})`;
    case "union": {
      const withoutNull = type.options.filter((option) => option.kind !== "null");
      const hasNull = withoutNull.length !== type.options.length;

      if (withoutNull.length === 0) return "z.null()";

      if (withoutNull.length === 1) {
        const base = renderZod(withoutNull[0], context, level);
        return hasNull ? `${base}.nullable()` : base;
      }

      const members = withoutNull.map((option) => renderZod(option, context, level));
      const union = `z.union([${members.join(", ")}])`;
      return hasNull ? `${union}.nullable()` : union;
    }
  }
}

function renderZodObject(
  shape: InferredType & { kind: "object" },
  context: EmitContext,
  level: number,
): string {
  if (shape.properties.length === 0) return "z.object({})";

  const inner = pad(context, level + 1);
  const lines = shape.properties.map((property) => {
    const key = isValidIdentifier(property.name) ? property.name : JSON.stringify(property.name);
    const base = renderZod(property.type, context, level + 1);
    const value = property.optional ? `${base}.optional()` : base;
    return `${inner}${key}: ${value},`;
  });

  return `z.object({\n${lines.join("\n")}\n${pad(context, level)}})`;
}

function countLines(code: string): number {
  return code.split("\n").filter((line) => line.trim().length > 0).length;
}
