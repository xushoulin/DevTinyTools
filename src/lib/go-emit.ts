/**
 * Emit Go struct declarations from an inferred shape.
 *
 * The inference rules are shared with the TypeScript emitter, but Go forces
 * decisions TypeScript never has to make, so this module owns four of them:
 *
 * 1. **Numbers split by width.** `int64` when every sampled value was a whole
 *    number, `float64` as soon as one was fractional. Go has no `number`.
 * 2. **Null becomes a pointer.** A field that was null in some sample becomes
 *    `*string`, because Go's zero value cannot distinguish "absent" from
 *    "empty". Slices, maps and `any` are already nil-able and are left alone.
 * 3. **Omitted keys become `,omitempty`.** Not a pointer: the two encode
 *    different facts about the data and conflating them produces structs that
 *    marshal the wrong shape.
 * 4. **No union type exists.** Two unrelated kinds in one position collapse to
 *    `any` rather than inventing a type Go cannot express.
 *
 * Field names follow Go's exported-name conventions, including the standard
 * initialisms (`id` → `ID`, `api_url` → `APIURL`), and columns are aligned the
 * way `gofmt` would align them so the output can be pasted without a re-format.
 */

import {
  nameObjectTypes,
  toPascalCase,
  type InferredType,
  type NamedType,
} from "./type-infer";

export interface GoEmitOptions {
  /** Name of the root struct. Normalised to an exported PascalCase name. */
  rootName?: string;
  /** Append `,omitempty` to fields that were missing from some samples. */
  omitempty?: boolean;
  /** Emit a `package` clause at the top. Omitted when empty. */
  packageName?: string;
}

export interface GoEmitResult {
  code: string;
  /** Number of struct declarations, including the root. */
  typeCount: number;
  lineCount: number;
}

/** Standard Go initialisms, as listed by golint's commonInitialisms. */
const INITIALISMS = new Set([
  "ACL", "API", "ASCII", "CPU", "CSS", "DNS", "EOF", "GUID", "HTML", "HTTP",
  "HTTPS", "ID", "IP", "JSON", "QPS", "RAM", "RPC", "SLA", "SMTP", "SQL",
  "SSH", "TCP", "TLS", "TTL", "UDP", "UI", "UID", "UUID", "URI", "URL",
  "UTF8", "VM", "XML", "XMPP", "XSRF", "XSS",
]);

interface GoContext {
  named: NamedType[];
  byShape: Map<InferredType, NamedType>;
  omitempty: boolean;
}

export function emitGo(root: InferredType, options: GoEmitOptions = {}): GoEmitResult {
  const rootName = goTypeName(toPascalCase((options.rootName ?? "").trim()) || "Root");
  const named = buildNamed(root, rootName);
  const context: GoContext = {
    named,
    byShape: new Map(named.map((entry) => [entry.shape as InferredType, entry])),
    omitempty: options.omitempty !== false,
  };

  const blocks: string[] = [];
  const packageName = sanitizePackageName(options.packageName ?? "");
  if (packageName) blocks.push(`package ${packageName}`);

  for (const entry of named) {
    blocks.push(renderStruct(entry, context));
  }

  // A root that is not an object still deserves a name: `type Events []Event`
  // is what a caller unmarshals into.
  if (root.kind !== "object") {
    blocks.push(`type ${rootName} ${goFieldType(root, context)}`);
  }

  const code = `${blocks.join("\n\n")}\n`;
  return {
    code,
    typeCount: named.length + (root.kind === "object" ? 0 : 1),
    lineCount: countLines(code),
  };
}

/* ------------------------------------------------------------------ *
 * Named declarations
 * ------------------------------------------------------------------ */

function buildNamed(root: InferredType, rootName: string): NamedType[] {
  const named: NamedType[] = [];
  const used = new Set<string>();

  for (const entry of nameObjectTypes(root, rootName)) {
    let name = goTypeName(entry.name);
    if (used.has(name)) {
      let suffix = 2;
      while (used.has(`${name}${suffix}`)) suffix += 1;
      name = `${name}${suffix}`;
    }
    used.add(name);
    named.push({ name, identifier: entry.identifier, shape: entry.shape });
  }

  return named;
}

/** Go exported names start with a letter; the inference can produce `2fa`. */
function goTypeName(name: string): string {
  if (!name) return "Root";
  return /^[A-Za-z]/.test(name) ? name : `T${name}`;
}

function renderStruct(entry: NamedType, context: GoContext): string {
  const properties = entry.shape.properties;

  if (properties.length === 0) {
    return `type ${entry.name} struct {\n}`;
  }

  const usedFields = new Set<string>();
  const rows = properties.map((property) => ({
    field: uniqueFieldName(property.name, usedFields),
    type: goFieldType(property.type, context),
    tag: structTag(property.name, property.optional && context.omitempty),
  }));

  // gofmt aligns the three columns; matching that means the pasted result is
  // already formatted instead of triggering a diff on the first save.
  const fieldWidth = Math.max(...rows.map((row) => row.field.length));
  const typeWidth = Math.max(...rows.map((row) => row.type.length));

  const lines = rows.map(
    (row) => `\t${row.field.padEnd(fieldWidth)} ${row.type.padEnd(typeWidth)} ${row.tag}`,
  );

  return `type ${entry.name} struct {\n${lines.join("\n")}\n}`;
}

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

/** The Go type for one property, including the pointer a null forces. */
function goFieldType(type: InferredType, context: GoContext): string {
  if (type.kind === "null") return "any";
  if (type.kind === "unknown") return "any";

  if (type.kind === "union") {
    const concrete = type.options.filter((option) => option.kind !== "null");
    const nullable = concrete.length !== type.options.length;

    if (concrete.length === 0) return "any";
    if (concrete.length > 1) {
      // Go has no sum type. `any` is honest; picking one member silently drops
      // valid data at unmarshal time.
      return "any";
    }

    const base = goType(concrete[0], context);
    return nullable && !isNilable(base) ? `*${base}` : base;
  }

  return goType(type, context);
}

function goType(type: InferredType, context: GoContext): string {
  switch (type.kind) {
    case "string":
      return "string";
    case "number":
      // `undefined` means the shape was built by hand rather than inferred;
      // whole numbers are the common case, so default to int64.
      return (type.integer ?? true) ? "int64" : "float64";
    case "boolean":
      return "bool";
    case "null":
    case "unknown":
      return "any";
    case "object": {
      const entry = context.byShape.get(type);
      if (entry) return entry.name;
      // Unreachable while inference caps depth below the naming walk's limit.
      return "any";
    }
    case "array":
      return `[]${goFieldType(type.items, context)}`;
    case "union":
      return "any";
  }
}

/** Types whose zero value already covers a missing or null JSON value. */
function isNilable(goTypeName_: string): boolean {
  return (
    goTypeName_ === "any" ||
    goTypeName_.startsWith("*") ||
    goTypeName_.startsWith("[]") ||
    goTypeName_.startsWith("map[")
  );
}

/* ------------------------------------------------------------------ *
 * Field names and tags
 * ------------------------------------------------------------------ */

function uniqueFieldName(key: string, used: Set<string>): string {
  const base = toGoFieldName(key);
  let name = base;
  let suffix = 2;
  while (used.has(name)) {
    name = `${base}${suffix}`;
    suffix += 1;
  }
  used.add(name);
  return name;
}

/**
 * `user_id` → `UserID`, `apiUrl` → `APIURL`, `created_at` → `CreatedAt`.
 *
 * The original key is preserved in the tag, so a lossy field name costs
 * nothing at the encoding/json boundary.
 */
export function toGoFieldName(key: string): string {
  const words = splitWords(key);
  const name = words
    .map((word) => {
      const upper = word.toUpperCase();
      if (INITIALISMS.has(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join("");

  if (!name) return "Field";
  // A leading digit is not a valid identifier start.
  return /^[A-Za-z]/.test(name) ? name : `X${name}`;
}

function splitWords(input: string): string[] {
  return input
    .replace(/[^A-Za-z0-9]+/g, " ")
    // camelCase boundary
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    // HTTPServer → HTTP Server
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function structTag(key: string, omitempty: boolean): string {
  const value = omitempty ? `${key},omitempty` : key;
  const tag = `json:${quoted(value)}`;
  // A backtick cannot appear inside a raw string literal; fall back to an
  // interpreted one, where `"json:\"a`b\""` is valid.
  return tag.includes("`") ? quoted(tag) : `\`${tag}\``;
}

/** A Go interpreted string literal. */
function quoted(value: string): string {
  let out = '"';
  for (const char of value) {
    if (char === '"') out += '\\"';
    else if (char === "\\") out += "\\\\";
    else if (char === "\n") out += "\\n";
    else if (char === "\r") out += "\\r";
    else if (char === "\t") out += "\\t";
    else out += char;
  }
  return `${out}"`;
}

function sanitizePackageName(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "")
    .replace(/^_+/, "");
  if (!cleaned) return "";
  return /^[a-z]/.test(cleaned) ? cleaned : `pkg${cleaned}`;
}

function countLines(code: string): number {
  return code.split("\n").filter((line) => line.trim().length > 0).length;
}
