/**
 * Type inference for JSON documents.
 *
 * The generator answers one question: given a sample of JSON, what TypeScript
 * (or Zod) shape describes it? Three rules decide everything:
 *
 * 1. **Every array element is sampled, and the results are merged.** A key that
 *    is present in some elements but not others becomes optional instead of
 *    required — that is the difference between types that compile against the
 *    real payload and types that only describe the first element.
 * 2. **Disagreeing kinds become a union**, never a guess. `string` and `number`
 *    in the same position produce `string | number`; `null` joins as a member
 *    of the union too.
 * 3. **Nesting is structural.** Objects and arrays are compared recursively, so
 *    `[{ "a": { "b": 1 } }, { "a": {} }]` marks `b` optional inside the child
 *    object and keeps the child itself required.
 *
 * Pure and synchronous: the caller parses text, this module never touches it.
 */

export type InferredType =
  | { kind: "string" }
  /**
   * `integer` records whether every sampled value was a whole number. It only
   * matters to targets that distinguish numeric widths (Go's int64 vs float64);
   * TypeScript and Zod render both as `number`, so the flag never appears in
   * those outputs nor in `typeSignature`.
   */
  | { kind: "number"; integer?: boolean }
  | { kind: "boolean" }
  | { kind: "null" }
  | { kind: "unknown" }
  | { kind: "object"; properties: InferredProperty[] }
  | { kind: "array"; items: InferredType }
  | { kind: "union"; options: InferredType[] };

export interface InferredProperty {
  /** Member name exactly as it appears in the JSON. */
  name: string;
  type: InferredType;
  /** True when at least one sampled array element omitted this key. */
  optional: boolean;
}

export interface InferOptions {
  /** Depth at which inference gives up and emits `unknown`. */
  maxDepth?: number;
}

const DEFAULT_MAX_DEPTH = 32;

/** Infer the type of a single parsed JSON value. */
export function inferType(value: unknown, options: InferOptions = {}): InferredType {
  return inferAt(value, 0, options.maxDepth ?? DEFAULT_MAX_DEPTH);
}

function inferAt(value: unknown, depth: number, maxDepth: number): InferredType {
  if (depth > maxDepth) return { kind: "unknown" };

  if (value === null) return { kind: "null" };

  switch (typeof value) {
    case "string":
      return { kind: "string" };
    case "number":
      return { kind: "number", integer: Number.isInteger(value) };
    case "boolean":
      return { kind: "boolean" };
    case "object":
      break;
    default:
      // undefined, function, symbol and bigint cannot come out of JSON.parse,
      // but a caller may hand us a value it built itself.
      return { kind: "unknown" };
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { kind: "array", items: { kind: "unknown" } };
    }
    let items = inferAt(value[0], depth + 1, maxDepth);
    for (let index = 1; index < value.length; index += 1) {
      items = mergeTypes(items, inferAt(value[index], depth + 1, maxDepth));
    }
    return { kind: "array", items };
  }

  const properties: InferredProperty[] = [];
  const record = value as Record<string, unknown>;

  for (const name of Object.keys(record)) {
    properties.push({
      name,
      type: inferAt(record[name], depth + 1, maxDepth),
      optional: false,
    });
  }

  return { kind: "object", properties };
}

/**
 * Merge two inferred shapes into one that describes both samples.
 *
 * Objects merge their property sets (a key missing from either side becomes
 * optional). Arrays merge their item types. Anything else that disagrees
 * becomes a union with duplicates removed.
 */
export function mergeTypes(left: InferredType, right: InferredType): InferredType {
  if (left.kind === "unknown") return right;
  if (right.kind === "unknown") return left;

  if (left.kind === "object" && right.kind === "object") {
    return { kind: "object", properties: mergeProperties(left.properties, right.properties) };
  }

  if (left.kind === "array" && right.kind === "array") {
    return { kind: "array", items: mergeTypes(left.items, right.items) };
  }

  if (left.kind === "number" && right.kind === "number") {
    // A whole number next to a fractional one must widen to a float; two whole
    // numbers stay integers. `undefined` is treated as integer, which is what
    // the emitters assume when they see a hand-built shape.
    const leftInteger = left.integer ?? true;
    const rightInteger = right.integer ?? true;
    if (leftInteger === rightInteger) return left;
    return { kind: "number", integer: false };
  }

  if (left.kind === right.kind) {
    // string / boolean / null: identical shapes, nothing to merge.
    return left;
  }

  return unionOf(flattenUnion(left), flattenUnion(right));
}

function mergeProperties(
  left: InferredProperty[],
  right: InferredProperty[],
): InferredProperty[] {
  const merged: InferredProperty[] = [];
  const rightByName = new Map(right.map((property) => [property.name, property]));
  const leftNames = new Set(left.map((property) => property.name));

  for (const property of left) {
    const counterpart = rightByName.get(property.name);
    if (!counterpart) {
      // Present here, absent in the other sample: keep the inferred type but
      // mark it optional so the output compiles against both.
      merged.push({ ...property, optional: true });
      continue;
    }
    merged.push({
      name: property.name,
      type: mergeTypes(property.type, counterpart.type),
      optional: property.optional || counterpart.optional,
    });
  }

  for (const property of right) {
    if (leftNames.has(property.name)) continue;
    merged.push({ ...property, optional: true });
  }

  return merged;
}

function flattenUnion(type: InferredType): InferredType[] {
  return type.kind === "union" ? type.options : [type];
}

function unionOf(left: InferredType[], right: InferredType[]): InferredType {
  const bySignature = new Map<string, InferredType>();
  for (const option of [...left, ...right]) {
    // A union member that is itself a union is flattened by the caller.
    for (const member of flattenUnion(option)) {
      const signature = typeSignature(member);
      if (!bySignature.has(signature)) bySignature.set(signature, member);
    }
  }

  const options = [...bySignature.values()];
  if (options.length === 1) return options[0];
  return { kind: "union", options };
}

/** Stable string form of a shape, used to deduplicate union members. */
export function typeSignature(type: InferredType): string {
  switch (type.kind) {
    case "object":
      return `{${type.properties
        .map(
          (property) =>
            `${property.name}${property.optional ? "?" : ""}:${typeSignature(property.type)}`,
        )
        .join(",")}}`;
    case "array":
      return `${typeSignature(type.items)}[]`;
    case "union":
      return type.options
        .map(typeSignature)
        .sort()
        .join("|");
    default:
      return type.kind;
  }
}

/** True when the type carries no information at all. */
export function isUnknown(type: InferredType): boolean {
  return type.kind === "unknown";
}

/**
 * A named object shape ready to be emitted as an interface or a schema.
 *
 * `name` is unique within the document; nested objects get a name derived from
 * their path (`Root` → `RootAddress` → `RootOrdersItem`), which is what makes
 * the generated code readable instead of a wall of inline braces.
 */
export interface NamedType {
  name: string;
  /** camelCase form of `name`, for `const rootAddressSchema` declarations. */
  identifier: string;
  shape: InferredType & { kind: "object" };
}

/**
 * Walk the tree and assign a name to every object shape, in first-appearance
 * order. The root object is named after `rootName`.
 */
export function nameObjectTypes(root: InferredType, rootName = "Root"): NamedType[] {
  const named: NamedType[] = [];
  const used = new Set<string>();
  const queue: Array<{ type: InferredType; path: string; depth: number }> = [];

  function reserve(candidate: string): string {
    let name = candidate || "Root";
    let suffix = 2;
    while (used.has(name)) {
      name = `${candidate}${suffix}`;
      suffix += 1;
    }
    used.add(name);
    return name;
  }

  function enqueue(type: InferredType, path: string, depth: number): void {
    if (depth > 64) return;
    if (type.kind === "object") {
      queue.push({ type, path, depth });
      return;
    }
    if (type.kind === "array") {
      const isArrayOfObjects =
        type.items.kind === "object" || type.items.kind === "array" || type.items.kind === "union";
      // `items` already reads as a collection, so `RootItemsItem` would stutter.
      // Only append `Item` when the path does not already end in Items/Item.
      const itemSuffix = isArrayOfObjects && !/Items?$/.test(path) ? "Item" : "";
      enqueue(type.items, `${path}${itemSuffix}`, depth + 1);
      return;
    }
    if (type.kind === "union") {
      for (const option of type.options) enqueue(option, path, depth + 1);
    }
  }

  // The root may itself be an array or a primitive. Only objects get names;
  // an array of objects names its item type `RootItem`.
  if (root.kind === "object") {
    queue.push({ type: root, path: rootName, depth: 0 });
  } else if (root.kind === "array") {
    enqueue(root.items, `${rootName}Item`, 0);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const name = reserve(toPascalCase(current.path));
    const shape = current.type as InferredType & { kind: "object" };
    named.push({ name, identifier: toCamelCase(name), shape });

    for (const property of shape.properties) {
      const childPath = `${name}${toPascalCase(property.name)}`;
      enqueue(property.type, childPath, current.depth + 1);
    }
  }

  return named;
}

/** `user_name` / `user-name` / `user name` → `UserName`. */
export function toPascalCase(input: string): string {
  const words = input
    .replace(/[^A-Za-z0-9]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "";
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/** `RootAddress` → `rootAddress`. */
export function toCamelCase(input: string): string {
  if (!input) return "";
  return input.charAt(0).toLowerCase() + input.slice(1);
}

/** True when `name` can be used as an unquoted object key / identifier. */
export function isValidIdentifier(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name);
}
