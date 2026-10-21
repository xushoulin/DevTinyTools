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
];

export const PLANNED_TOOLS = [
  {
    name: "JSON Diff Checker",
    summary:
      "Compare two JSON documents and highlight added, removed and changed values.",
  },
  {
    name: "JSON to CSV",
    summary: "Turn an array of JSON objects into a CSV file you can open in a spreadsheet.",
  },
];

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
