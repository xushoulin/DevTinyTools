/**
 * Emit a JSON Schema (draft 2020-12) from an inferred shape.
 *
 * Same traversal as the TypeScript and Go emitters, one more target language.
 * The decisions that matter here:
 *
 * 1. **required is computed, not guessed.** A key that every sampled element
 *    carries lands in `required`; anything optional stays out. Single-sample
 *    generators mark everything required, which produces schemas that reject
 *    the second response they ever validate.
 * 2. **Numbers split by width.** Whole numbers are `integer`, a fractional
 *    sample widens the slot to `number` — mirroring what the Go emitter does.
 * 3. **Unions of primitives collapse into a `type` array** (`"string"`,
 *    `"null"`). A union that involves an object cannot be expressed that way,
 *    so it becomes `anyOf` — the only honest encoding.
 * 4. **Nested objects live in `$defs`** and are referenced by `$ref`, named
 *    after their path, exactly like the TypeScript interfaces.
 *
 * `additionalProperties: false` is on by default: a schema derived from a
 * sample should say what it saw rather than permit anything unseen.
 */

import {
  nameObjectTypes,
  toPascalCase,
  type InferredType,
  type NamedType,
} from "./type-infer";

export interface SchemaEmitOptions {
  /** Title of the root schema, and the name of the root `$def` if reused. */
  rootName?: string;
  /** Set `additionalProperties: false` on every object. Default true. */
  additionalProperties?: boolean;
  /** Spaces per nesting level of the emitted JSON. */
  indent?: 2 | 4;
}

export interface SchemaEmitResult {
  /** The schema, pretty-printed JSON with a trailing newline. */
  code: string;
  /** Number of named definitions in `$defs`, plus the root when it is a primitive. */
  typeCount: number;
  lineCount: number;
}

interface SchemaContext {
  named: NamedType[];
  byShape: Map<InferredType, NamedType>;
  strict: boolean;
  /** Where named objects live, e.g. `#/$defs/` (JSON Schema) or
   *  `#/components/schemas/` (OpenAPI). */
  refPrefix: string;
}

const SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema";

export function emitJsonSchema(
  root: InferredType,
  options: SchemaEmitOptions = {},
): SchemaEmitResult {
  const rootName = toPascalCase((options.rootName ?? "").trim()) || "Root";
  const named = nameObjectTypes(root, rootName);
  const context: SchemaContext = {
    named,
    byShape: new Map(named.map((entry) => [entry.shape as InferredType, entry])),
    strict: options.additionalProperties !== false,
    refPrefix: "#/$defs/",
  };

  const defs: Record<string, unknown> = {};
  for (const entry of named) {
    // The root object is inlined at the top level; only nested shapes go to
    // `$defs`, so the schema reads top-down instead of through a pointer.
    if (entry.shape !== root) {
      defs[entry.name] = renderObjectSchema(entry.shape, context);
    }
  }

  // The root object renders inline at the top level; only nested shapes go
  // to `$defs`, so the schema reads top-down instead of through a pointer.
  const body =
    root.kind === "object" ? renderObjectSchema(root, context) : renderSchema(root, context);
  const schema: Record<string, unknown> = {
    $schema: SCHEMA_DIALECT,
    title: rootName,
    ...body,
  };
  if (Object.keys(defs).length > 0) schema.$defs = defs;

  const code = `${JSON.stringify(schema, null, options.indent ?? 2)}\n`;
  return {
    code,
    typeCount: named.length + (root.kind === "object" ? 0 : 1),
    lineCount: countLines(code),
  };
}

function renderObjectSchema(
  shape: InferredType & { kind: "object" },
  context: SchemaContext,
): Record<string, unknown> {
  const schema: Record<string, unknown> = { type: "object" };

  if (shape.properties.length > 0) {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const property of shape.properties) {
      properties[property.name] = renderSchema(property.type, context);
      if (!property.optional) required.push(property.name);
    }

    schema.properties = properties;
    if (required.length > 0) schema.required = required;
  }

  if (context.strict) schema.additionalProperties = false;
  return schema;
}

function renderSchema(type: InferredType, context: SchemaContext): Record<string, unknown> {
  switch (type.kind) {
    case "string":
      return { type: "string" };
    case "number":
      return { type: (type.integer ?? true) ? "integer" : "number" };
    case "boolean":
      return { type: "boolean" };
    case "null":
      return { type: "null" };
    case "unknown":
      // An empty schema accepts anything, which is what `unknown` means.
      return {};
    case "object": {
      const entry = context.byShape.get(type);
      if (entry) return { $ref: `${context.refPrefix}${entry.name}` };
      // Unreachable while inference caps depth below the naming walk's limit.
      return { type: "object" };
    }
    case "array":
      return { type: "array", items: renderSchema(type.items, context) };
    case "union": {
      const primitiveKinds = new Set(["string", "number", "boolean", "null"]);
      const allPrimitive = type.options.every(
        (option) => option.kind === "number" || primitiveKinds.has(option.kind),
      );

      if (allPrimitive) {
        // number integer: false wins over integer: true — widening is safe.
        const sawFraction = type.options.some(
          (option) => option.kind === "number" && option.integer === false,
        );
        const kinds = [
          ...new Set(
            type.options.map((option) =>
              option.kind === "number" && sawFraction ? "number" : option.kind,
            ),
          ),
        ];
        return kinds.length === 1 ? { type: kinds[0] } : { type: kinds };
      }

      const members = type.options.map((option) => renderSchema(option, context));
      return members.length === 1 ? members[0] : { anyOf: members };
    }
  }
}

function countLines(code: string): number {
  return code.split("\n").filter((line) => line.trim().length > 0).length;
}

/* ------------------------------------------------------------------ *
 * OpenAPI 3.1
 * ------------------------------------------------------------------ */

export interface OpenApiEmitOptions {
  /** Name of the root schema, and the default API title. */
  rootName?: string;
  /** Overrides the generated `info.title`. */
  apiTitle?: string;
  /** Set `additionalProperties: false` on every object. Default true. */
  additionalProperties?: boolean;
  /** Spaces per nesting level of the emitted JSON. */
  indent?: 2 | 4;
}

/**
 * Wrap the same inference in an OpenAPI 3.1 document. OpenAPI 3.1 adopts
 * JSON Schema 2020-12 wholesale, so every named object lands in
 * `components.schemas` and any 3.1 tool — Swagger UI, Postman, code
 * generators — can consume the result without conversion.
 *
 * There are no paths: a JSON sample knows data shapes, not endpoints. The
 * document is a schema library the caller attaches to routes they know.
 */
export function emitOpenApi(
  root: InferredType,
  options: OpenApiEmitOptions = {},
): SchemaEmitResult {
  const rootName = toPascalCase((options.rootName ?? "").trim()) || "Root";
  const named = nameObjectTypes(root, rootName);
  const context: SchemaContext = {
    named,
    byShape: new Map(named.map((entry) => [entry.shape as InferredType, entry])),
    strict: options.additionalProperties !== false,
    refPrefix: "#/components/schemas/",
  };

  const schemas: Record<string, unknown> = {};
  for (const entry of named) {
    schemas[entry.name] = renderObjectSchema(entry.shape, context);
  }
  if (root.kind !== "object") {
    schemas[rootName] = renderSchema(root, context);
  }

  const document: Record<string, unknown> = {
    openapi: "3.1.0",
    info: {
      title: options.apiTitle?.trim() || `${rootName} API`,
      version: "1.0.0",
      description:
        "Generated from a JSON sample by DevTinyTools. Every array element was sampled, so required reflects the data you pasted.",
    },
    jsonSchemaDialect: SCHEMA_DIALECT,
    components: { schemas },
  };

  const code = `${JSON.stringify(document, null, options.indent ?? 2)}\n`;
  return {
    code,
    typeCount: Object.keys(schemas).length,
    lineCount: countLines(code),
  };
}
