/**
 * Python model emission (Pydantic v2 or dataclasses).
 *
 * Python's own traps shape the output, and they are not the same ones Go, Java
 * or C# have:
 *
 * 1. **`from` and `class` are keywords.** APIs send keys like `class`, `from`,
 *    `import`, `in`, `id`. A field called `class` is a SyntaxError, so the name
 *    gets a trailing underscore (`class_`) and the wire name moves into
 *    `Field(alias=...)`. Renaming without the alias silently drops the value.
 * 2. **PEP 8 wants snake_case, the wire does not.** `orderId` becomes
 *    `order_id`; the original key must come back through `Field(alias=...)`,
 *    plus `populate_by_name=True` so the model still accepts the Python name.
 * 3. **Dataclasses reject a default before a required field.** A missing-key
 *    field is `Optional[X] = None`, and putting that above a required field
 *    raises `TypeError: non-default argument follows default argument` at import
 *    time. Optional fields are therefore emitted last.
 * 4. **Nested models must be defined first.** Pydantic resolves annotations
 *    when the class body executes, so children are emitted before the classes
 *    that reference them.
 * 5. **int is arbitrary precision.** Unlike JavaScript, Python reads a 19-digit
 *    id exactly, so integers stay `int` rather than widening to float.
 *
 * No `from __future__ import annotations`: with real annotations Pydantic
 * resolves the model at class creation, so the file works as soon as it is
 * imported — no `model_rebuild()` — at the cost of requiring Python 3.9+ for
 * `list[...]`.
 */

import { nameObjectTypes, toPascalCase, type InferredType, type NamedType } from "./type-infer";

export type PythonTarget = "pydantic" | "dataclass";

export interface PythonEmitOptions {
  target: PythonTarget;
  /** Class name for the root object. */
  rootName: string;
  /**
   * Map snake_case field names back to the JSON keys with `Field(alias=...)`
   * (Pydantic) or `# JSON: <key>` comments (dataclasses).
   */
  aliases: boolean;
}

export interface PythonEmitResult {
  code: string;
  classCount: number;
  lineCount: number;
}

/** Python keywords plus names the two model bases already use. */
const RESERVED = new Set([
  "False",
  "None",
  "True",
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield",
  // names that collide with the model bases
  "self",
  "cls",
  "model_config",
  "model_fields",
  "model_dump",
  "model_validate",
  "model_json_schema",
]);

export function emitPython(root: InferredType, options: PythonEmitOptions): PythonEmitResult {
  // The class name comes from free text in the UI, so normalise it here rather
  // than trusting the caller: `my order` would otherwise be a syntax error.
  const rootName = modelName(options.rootName);
  let named = nameObjectTypes(root, rootName);
  const preamble: string[] = [];

  if (root.kind !== "object") {
    const element = root.kind === "array" ? root.items : null;
    const elementShape = element && element.kind === "object" ? element : null;

    if (!elementShape) {
      const annotation = pythonType(root, new Map());
      return {
        code: `# The JSON root is ${describe(root)}, which needs no model:\n#   value: ${annotation} = ...\n# Paste an object or an array of objects to generate models.\n`,
        classCount: 0,
        lineCount: 3,
      };
    }

    // Re-derive the nested names from the root, so children read as
    // OrderCustomer rather than OrderItemCustomer.
    named = nameObjectTypes(elementShape, rootName);
    preamble.push(
      `# The JSON root is an array. This file models one element; hold the document in list[${rootName}].`,
    );
  }

  const byShape = new Map<InferredType, string>();
  for (const entry of named) byShape.set(entry.shape, entry.name);

  // Children before parents: Pydantic evaluates annotations at class creation.
  const ordered = [...named].reverse();
  const bodies = ordered.map((entry) => classBody(entry, options, byShape));
  const body = bodies.join("\n\n\n");

  const needsOptional = /Optional\[/.test(body);
  const needsUnion = /Union\[/.test(body);
  const needsAny = /\bAny\b/.test(body);
  const needsField = /\bField\(/.test(body);
  const needsConfig = /ConfigDict\(/.test(body);

  const typingNames = [
    needsAny ? "Any" : null,
    needsOptional ? "Optional" : null,
    needsUnion ? "Union" : null,
  ].filter((name): name is string => Boolean(name));

  const importLines: string[] = [];
  if (options.target === "pydantic") {
    const pydanticNames = ["BaseModel", needsConfig ? "ConfigDict" : null, needsField ? "Field" : null]
      .filter((name): name is string => Boolean(name))
      .join(", ");
    importLines.push(`from pydantic import ${pydanticNames}`);
  } else {
    importLines.push("from dataclasses import dataclass");
  }
  if (typingNames.length > 0) {
    importLines.push(`from typing import ${typingNames.join(", ")}`);
  }

  const blocks: string[] = [];
  if (preamble.length > 0) blocks.push(preamble.join("\n"));
  blocks.push(importLines.join("\n"));

  if (options.target === "dataclass" && options.aliases && /# JSON: /.test(body)) {
    blocks.push(
      "# Field names are snake_case. The original JSON keys are noted in comments;\n# map them at parse time (e.g. with pydantic) if you load raw documents.",
    );
  }

  // Top-level definitions are separated by two blank lines (PEP 8).
  const code = `${blocks.join("\n\n")}\n\n\n${body}\n`;

  return {
    code,
    classCount: named.length,
    lineCount: code.split("\n").filter((line) => line.trim().length > 0).length,
  };
}

function classBody(
  entry: NamedType,
  options: PythonEmitOptions,
  byShape: Map<InferredType, string>,
): string {
  const unit = "    ";
  const header = options.target === "pydantic" ? `class ${entry.name}(BaseModel):` : `class ${entry.name}:`;
  const lines: string[] = [];

  if (options.target === "dataclass") lines.push("@dataclass");
  lines.push(header);

  const properties = options.target === "dataclass"
    ? orderForDataclass(entry)
    : entry.shape.properties;

  if (properties.length === 0) {
    lines.push(`${unit}pass`);
    return lines.join("\n");
  }

  const used = new Set<string>();
  const fields: string[] = [];
  const rows = properties.map((property) => {
    const name = pythonName(property.name, used);
    return { property, name, type: pythonType(property.type, byShape) };
  });

  const needsConfig =
    options.target === "pydantic"
      && options.aliases
      && rows.some((row) => row.name !== row.property.name);

  const annotation = (type: string, nullable: boolean): string =>
    nullable ? `Optional[${type}]` : type;

  const assignment = (name: string, jsonName: string, optional: boolean): string => {
    const alias = options.aliases && name !== jsonName ? pyString(jsonName) : null;

    if (options.target === "pydantic") {
      if (alias && optional) return ` = Field(default=None, alias=${alias})`;
      if (alias) return ` = Field(alias=${alias})`;
      if (optional) return " = None";
      return "";
    }

    const comment = alias ? `  # JSON: ${jsonName}` : "";
    if (optional) return ` = None${comment}`;
    return comment;
  };

  for (const row of rows) {
    const nullable = row.property.optional || containsNull(row.property.type);
    const type = annotation(row.type, nullable);
    fields.push(`${unit}${row.name}: ${type}${assignment(row.name, row.property.name, row.property.optional)}`);
  }

  if (needsConfig) {
    lines.push(`${unit}model_config = ConfigDict(populate_by_name=True)`, "");
  }

  lines.push(...fields);
  return lines.join("\n");
}

/**
 * Dataclasses raise `TypeError: non-default argument follows default argument`
 * when a field with a default is declared above one without. Optional fields
 * (which carry `= None`) are therefore moved to the end, keeping their relative
 * order.
 */
function orderForDataclass(entry: NamedType) {
  const required = entry.shape.properties.filter((property) => !property.optional);
  const optional = entry.shape.properties.filter((property) => property.optional);
  return [...required, ...optional];
}

/** `coupon_code` → `coupon_code`; `orderId` → `order_id`; `class` → `class_`. */
export function pythonName(jsonName: string, used: Set<string>): string {
  let snake = toSnakeCase(jsonName);
  if (!snake) snake = "value";
  if (/^[0-9]/.test(snake)) snake = `field_${snake}`;
  if (RESERVED.has(snake)) snake = `${snake}_`;

  let name = snake;
  let suffix = 2;
  while (used.has(name)) {
    name = `${snake}_${suffix}`;
    suffix += 1;
  }
  used.add(name);
  return name;
}

/** `orderId` / `order_id` / `Order ID` → `order_id`. */
export function toSnakeCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

/** Map an inferred type to a Python annotation. */
export function pythonType(type: InferredType, byShape: Map<InferredType, string>): string {
  switch (type.kind) {
    case "string":
      return "str";
    case "number":
      return type.integer ? "int" : "float";
    case "boolean":
      return "bool";
    case "object":
      return byShape.get(type) ?? "dict[str, Any]";
    case "array":
      return `list[${pythonType(type.items, byShape)}]`;
    case "union": {
      const members = type.options.filter((option) => option.kind !== "null");
      if (members.length === 0) return "Any";
      // int and float mix to float, as in the other members of this generator
      // family: Python would otherwise carry a Union nothing can serialise to.
      if (members.every((option) => option.kind === "number")) return "float";
      const mapped = [...new Set(members.map((option) => pythonType(option, byShape)))];
      if (mapped.length === 1) return mapped[0];
      return `Union[${mapped.join(", ")}]`;
    }
    case "null":
      // A field that is always null carries no shape; `Optional[Any]` is the
      // honest annotation (`x: None` would forbid every other value).
      return "Any";
    case "unknown":
      return "Any";
  }
}

function containsNull(type: InferredType): boolean {
  if (type.kind === "null") return true;
  if (type.kind === "union") return type.options.some(containsNull);
  return false;
}

/** A JSON string literal is also a valid Python string literal. */
function pyString(value: string): string {
  return JSON.stringify(value);
}

function describe(type: InferredType): string {
  switch (type.kind) {
    case "array":
      return `an array of ${describe(type.items)}`;
    case "object":
      return "an object";
    case "union": {
      const names = [...new Set(type.options.map(describe))];
      return names.join(" or ");
    }
    default:
      return `a ${type.kind}`;
  }
}

/** Class names are PascalCase and must not start with a digit. */
export function modelName(input: string): string {
  const pascal = toPascalCase(input);
  if (!pascal) return "Root";
  return /^[0-9]/.test(pascal) ? `Model${pascal}` : pascal;
}
