/** Single source of truth for navigation, the homepage list and the sitemap. */

export interface ToolDefinition {
  href: string;
  /** Short label used in navigation and cards. */
  name: string;
  /** Full page title (H1). */
  heading: string;
  /** One-sentence description shown on cards and in metadata. */
  summary: string;
  /** Meta description; kept under ~155 characters. */
  description: string;
  category: ToolCategory;
}

export type ToolCategory = "JSON";

export const TOOLS: ToolDefinition[] = [
  {
    href: "/json-formatter",
    name: "JSON Formatter",
    heading: "JSON Formatter & Validator",
    summary:
      "Pretty-print JSON with 2 or 4 space indentation, check the syntax and copy or download the result.",
    description:
      "Format and validate JSON online. Pretty-print with 2 or 4 spaces, catch syntax errors with line numbers, then copy or download the result. Runs in your browser.",
    category: "JSON",
  },
  {
    href: "/json-validator",
    name: "JSON Validator",
    heading: "JSON Validator",
    summary:
      "Check whether a JSON document is valid and see exactly where the parser stopped.",
    description:
      "Validate JSON online and get the line, column and a plain-English explanation of the error, plus a structure summary of the parsed document.",
    category: "JSON",
  },
  {
    href: "/json-minifier",
    name: "JSON Minifier",
    heading: "JSON Minifier",
    summary:
      "Strip whitespace from JSON and see how many bytes the minified output saves.",
    description:
      "Minify JSON by removing all unnecessary whitespace. Compare character counts and byte sizes before and after, then copy or download the compact result.",
    category: "JSON",
  },
  {
    href: "/json-diff",
    name: "JSON Diff",
    heading: "JSON Diff Checker",
    summary:
      "Compare two documents and list every added, removed and changed value with its path.",
    description:
      "Compare two JSON documents and see every added, removed and changed value with its exact path. Optional key-order and array-order matching. Runs in your browser.",
    category: "JSON",
  },
  {
    href: "/json-escape",
    name: "JSON Escape",
    heading: "JSON Escape & Unescape",
    summary:
      "Turn raw text into a JSON string value, or decode backslashes and \\u escapes back into readable text.",
    description:
      "Escape text for a JSON string or unescape \\u00e9, \\n and \\\" back to plain text. Flags sequences that are not valid JSON. Runs in your browser.",
    category: "JSON",
  },
  {
    href: "/json-to-csv",
    name: "JSON to CSV",
    heading: "JSON to CSV Converter",
    summary:
      "Turn an array of JSON objects into a CSV file you can open in a spreadsheet.",
    description:
      "Convert JSON to CSV online. Nested objects flatten into dotted columns, values are escaped per RFC 4180, and the result downloads ready for Excel. Runs in your browser.",
    category: "JSON",
  },
  {
    href: "/json-to-typescript",
    name: "JSON to TypeScript",
    heading: "JSON to TypeScript Generator",
    summary:
      "Generate TypeScript interfaces from a JSON sample, with optional properties and unions inferred from every array element.",
    description:
      "Generate TypeScript interfaces or a Zod schema from JSON. Every array element is sampled, so keys that only some records carry become optional.",
    category: "JSON",
  },
  {
    href: "/json-to-go",
    name: "JSON to Go",
    heading: "JSON to Go Struct Generator",
    summary:
      "Generate Go structs from a JSON sample, with json tags, int64 or float64 widths, pointers for null fields and omitempty for optional keys.",
    description:
      "Generate Go structs from JSON with json tags, int64 or float64 widths, pointers for null values and omitempty for optional keys. Runs in your browser.",
    category: "JSON",
  },
  {
    href: "/csv-to-json",
    name: "CSV to JSON",
    heading: "CSV to JSON Converter",
    summary:
      "Convert CSV to JSON with RFC 4180 parsing, delimiter detection, dotted headers unflattened into nested objects and numbers converted only when they round-trip exactly.",
    description:
      "Convert CSV to JSON in the browser. Handles quoted commas and line breaks, detects the delimiter, unflattens dotted headers and never rewrites a number it cannot round-trip.",
    category: "JSON",
  },
  {
    href: "/json-to-java",
    name: "JSON to Java",
    heading: "JSON to Java POJO Generator",
    summary:
      "Generate Java classes from JSON: primitives for required values, boxed types for optional and nullable ones, @JsonProperty for renamed keys and nested static classes.",
    description:
      "Generate Java POJOs from JSON with primitives or boxed types chosen per field, @JsonProperty for snake_case keys and nested objects as static classes. Runs in your browser.",
    category: "JSON",
  },
  {
    href: "/json-to-csharp",
    name: "JSON to C#",
    heading: "JSON to C# Class Generator",
    summary:
      "Generate C# classes from JSON with nullable annotations taken from every record, initialisers that avoid CS8618 and [JsonPropertyName] for each wire key.",
    description:
      "Generate C# classes from JSON with #nullable enable, long? and string? where a key is optional or null, and [JsonPropertyName] so System.Text.Json binds every key. Runs locally.",
    category: "JSON",
  },
];

export const PLANNED_TOOLS: Array<{ name: string; summary: string }> = [];

export const TOOL_CATEGORIES: Array<{
  name: ToolCategory;
  description: string;
}> = [
  {
    name: "JSON",
    description:
      "Inspect, clean up and debug JSON payloads. All processing runs locally in the browser tab.",
  },
];

export function getToolByHref(href: string): ToolDefinition | undefined {
  return TOOLS.find((tool) => tool.href === href);
}
