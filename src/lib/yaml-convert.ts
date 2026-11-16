import { parseAllDocuments, stringify } from "yaml";

/**
 * Result wrapper shared by both directions. `line` is populated when the
 * parser can attribute the failure to a position, so the UI can point at it.
 */
export type ConvertResult =
  | { ok: true; value: string }
  | { ok: false; error: string; line?: number };

export interface ConvertOptions {
  /** Indentation width for the generated output. */
  indent: 2 | 4;
}

export const DEFAULT_CONVERT_OPTIONS: ConvertOptions = { indent: 2 };

function fail(error: unknown): ConvertResult {
  const message = error instanceof Error ? error.message : String(error);
  // The `yaml` package reports positions as "(1:5)" inside the message.
  const at = message.match(/\((\d+):\d+\)/);
  return { ok: false, error: message, line: at ? Number(at[1]) : undefined };
}

/**
 * JSON text to YAML text. The JSON is read by the browser-standard parser
 * first, so a document that is not valid JSON is rejected with the same
 * message `JSON.parse` gives, before any YAML is written.
 *
 * Line width is unbounded (`lineWidth: 0`): the `yaml` package otherwise folds
 * long plain scalars at column 80, which is legal YAML but confuses people who
 * then copy the value and find a line break inside their URL.
 */
export function jsonToYaml(text: string, options: ConvertOptions = DEFAULT_CONVERT_OPTIONS): ConvertResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return fail(error);
  }
  try {
    const yaml = stringify(value, { indent: options.indent, lineWidth: 0 });
    return { ok: true, value: yaml };
  } catch (error) {
    return fail(error);
  }
}

/**
 * YAML text to JSON text. YAML files may hold several `---` separated
 * documents; instead of erroring, every document is collected and a single
 * JSON array is emitted, which is what `yaml.loadAll` consumers expect.
 */
export function yamlToJson(text: string, options: ConvertOptions = DEFAULT_CONVERT_OPTIONS): ConvertResult {
  let documents: unknown[];
  try {
    const parsed = parseAllDocuments(text);
    const errors: string[] = [];
    documents = [];
    for (const doc of parsed) {
      if (doc.errors.length > 0) {
        errors.push(...doc.errors.map((e) => e.message));
      } else {
        documents.push(doc.toJS());
      }
    }
    if (errors.length > 0) {
      return { ok: false, error: errors[0] };
    }
  } catch (error) {
    return fail(error);
  }

  if (documents.length === 0) {
    return { ok: false, error: "The input contains no YAML document." };
  }

  // A single document converts to the value itself; several documents become
  // an array in file order.
  const value = documents.length === 1 ? documents[0] : documents;
  try {
    return { ok: true, value: JSON.stringify(value, null, options.indent) + "\n" };
  } catch (error) {
    return fail(error);
  }
}
