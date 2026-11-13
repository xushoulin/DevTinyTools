/**
 * Java POJO emission.
 *
 * Java's mapping problems are not Go's, so the rules differ:
 *
 * 1. **Primitive vs boxed is the nullability decision.** A required whole
 *    number is `long`; the same field marked optional or nullable is `Long`,
 *    because a primitive cannot hold null. This is the Java answer to Go's
 *    pointer-versus-value question, and it is what makes the generated file
 *    deserialisable against real payloads.
 * 2. **Naming diverges from the wire.** `coupon_code` becomes `couponCode`, so
 *    the JSON name has to be preserved somewhere: a `@JsonProperty`
 *    annotation when Jackson is enabled, a `// json:` comment when it is not.
 * 3. **One compilable file.** Nested objects become `public static` classes
 *    inside the root class, because Java allows one public top-level class per
 *    file and splitting them would turn one paste into six files.
 * 4. **Generics cannot be primitive.** Every `List<...>` argument is boxed,
 *    even when the field itself would have been `long`.
 */

import { nameObjectTypes, toPascalCase, type InferredType } from "./type-infer";

export interface JavaEmitOptions {
  rootName: string;
  /** Package declaration, e.g. `com.example.model`. Omitted when blank. */
  packageName?: string;
  /** Emit `@JsonProperty` for fields whose Java name differs from the JSON key. */
  jackson: boolean;
  /** Emit getters and setters. */
  accessors: boolean;
  indent: 2 | 4;
}

export interface JavaEmitResult {
  code: string;
  typeCount: number;
  lineCount: number;
}

export function emitJava(root: InferredType, options: JavaEmitOptions): JavaEmitResult {
  const unit = " ".repeat(options.indent);
  let named = nameObjectTypes(root, options.rootName);
  const byShape = new Map<InferredType, string>();

  const header: string[] = [];

  if (root.kind !== "object") {
    const element = root.kind === "array" ? root.items : null;
    const elementShape = element && element.kind === "object" ? element : null;

    if (!elementShape) {
      // A bare primitive root has no class to generate. Say so instead of
      // inventing a wrapper the API never sends.
      return {
        code: `// The JSON root is ${describe(root)}, which Java models without a class:\n//   ${javaType(root, true, byShape)} value = ...;\n// Paste an object or an array of objects to generate a POJO.\n`,
        typeCount: 0,
        lineCount: 3,
      };
    }

    // Name the element class after the root — and re-derive every nested name
    // from it, so the children are OrderCustomer rather than OrderItemCustomer.
    named = nameObjectTypes(elementShape, options.rootName);
    header.push(
      `// The JSON root is an array. This file models one element; hold them in List<${options.rootName}>.`,
    );
  }

  for (const entry of named) byShape.set(entry.shape, entry.name);

  const declarations = named;

  const usesList = containsArray(root) || named.some((entry) => entry.shape.properties.some((p) => needsListForType(p.type)));
  const usesJackson =
    options.jackson && declarations.some((entry) => entry.shape.properties.some((p) => fieldName(p.name) !== p.name));

  const imports: string[] = [];
  if (usesList) imports.push("import java.util.List;");
  if (usesJackson) imports.push("import com.fasterxml.jackson.annotation.JsonProperty;");

  const lines: string[] = [];
  if (options.packageName?.trim()) lines.push(`package ${options.packageName.trim()};`, "");

  if (header.length > 0) {
    lines.push(...header);
  }

  if (imports.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push(...imports);
  }

  let typeCount = 0;

  declarations.forEach((entry, index) => {
    if (lines.length > 0 && lines[lines.length - 1] !== "") lines.push("");
    const isRoot = index === 0;
    const declaration = isRoot
      ? `public class ${entry.name} {`
      : `${unit}public static class ${entry.name} {`;

    lines.push(declaration);
    typeCount += 1;

    const fieldIndent = isRoot ? unit : unit.repeat(2);

    for (const property of entry.shape.properties) {
      const javaName = fieldName(property.name);
      const nullable = property.optional || containsNull(property.type);
      const type = javaType(property.type, nullable, byShape);
      const annotation = options.jackson && javaName !== property.name
        ? `@JsonProperty("${property.name.replace(/"/g, '\\"')}")`
        : null;
      const jsonComment = !options.jackson && javaName !== property.name
        ? ` // json: ${property.name}`
        : "";

      if (annotation) lines.push(`${fieldIndent}${annotation}`);
      lines.push(`${fieldIndent}private ${type} ${javaName};${jsonComment}`);

      if (options.accessors) {
        const capitalised = javaName.charAt(0).toUpperCase() + javaName.slice(1);
        const getterPrefix = type === "boolean" || type === "Boolean" ? "is" : "get";
        lines.push("");
        lines.push(`${fieldIndent}public ${type} ${getterPrefix}${capitalised}() { return ${javaName}; }`);
        lines.push(
          `${fieldIndent}public void set${capitalised}(${type} ${javaName}) { this.${javaName} = ${javaName}; }`,
        );
      }
    }

    lines.push(`${isRoot ? "" : unit}}`);
  });

  const code = lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";

  return {
    code,
    typeCount,
    lineCount: code.split("\n").filter((line) => line.trim().length > 0).length,
  };
}

/** `coupon_code` → `couponCode`; keeps digits and already-camel names intact. */
export function fieldName(jsonName: string): string {
  const pascal = toPascalCase(jsonName);
  if (!pascal) return "value";
  const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1);
  // A leading digit cannot start a Java identifier.
  return /^[0-9]/.test(camel) ? `field${pascal}` : camel;
}

/**
 * Map an inferred type to a Java type. `boxed` forces a wrapper, which is what
 * nullable fields and every generic argument need.
 */
export function javaType(
  type: InferredType,
  boxed: boolean,
  byShape: Map<InferredType, string>,
): string {
  switch (type.kind) {
    case "string":
      return "String";
    case "number":
      return type.integer ? (boxed ? "Long" : "long") : boxed ? "Double" : "double";
    case "boolean":
      return boxed ? "Boolean" : "boolean";
    case "object":
      return byShape.get(type) ?? "Object";
    case "array":
      return `List<${javaType(type.items, true, byShape)}>`;
    case "union": {
      // null is not a type in Java: it is handled by boxing the other members.
      const members = type.options.filter((option) => option.kind !== "null");
      if (members.length === 0) return "Object";
      const mapped = [...new Set(members.map((option) => javaType(option, true, byShape)))];
      if (mapped.length === 1) return mapped[0];
      // long + double widens to Double; anything genuinely mixed is Object,
      // because Java has no union types and a guess would fail at runtime.
      if (mapped.every((name) => name === "Long" || name === "Double")) return "Double";
      return "Object";
    }
    case "null":
    case "unknown":
      return "Object";
  }
}

/** True when `null` appears anywhere in the type, which forces a wrapper. */
function containsNull(type: InferredType): boolean {
  if (type.kind === "null") return true;
  if (type.kind === "union") return type.options.some(containsNull);
  return false;
}

function containsArray(type: InferredType): boolean {
  if (type.kind === "array") return true;
  if (type.kind === "object") return type.properties.some((property) => containsArray(property.type));
  if (type.kind === "union") return type.options.some(containsArray);
  return false;
}

/** `List` is imported when a field type mentions it — unions hide that too. */
function needsListForType(type: InferredType): boolean {
  return containsArray(type);
}

function describe(type: InferredType): string {
  switch (type.kind) {
    case "array":
      return `an array of ${describe(type.items)}`;
    case "union":
      return "a mixed value";
    default:
      return type.kind;
  }
}
