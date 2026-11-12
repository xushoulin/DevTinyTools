/**
 * Renders a {@link DiffResult} as a plain-text report.
 *
 * The on-page list is the primary output; the report exists for the workflow
 * where the diff has to survive being attached to a ticket or checked into a
 * repo. Plain text with stable line prefixes is deliberately unformatted — it
 * diffs well and reads well in a terminal.
 */

import { previewValue, type DiffChangeType, type DiffEntry, type DiffResult } from "./json-diff";

const TYPE_LABEL: Record<DiffChangeType, string> = {
  added: "added",
  removed: "removed",
  changed: "changed",
  reordered: "reordered",
};

function countsLine(result: DiffResult): string {
  const { counts } = result;
  const parts: string[] = [];
  if (counts.changed > 0) parts.push(`${counts.changed} changed`);
  if (counts.added > 0) parts.push(`${counts.added} added`);
  if (counts.removed > 0) parts.push(`${counts.removed} removed`);
  if (counts.reordered > 0) parts.push(`${counts.reordered} reordered`);

  return parts.length > 0
    ? `Differences: ${result.total} (${parts.join(", ")})`
    : "Differences: 0";
}

function entryLine(entry: DiffEntry): string {
  const head = `[${TYPE_LABEL[entry.type]}] ${entry.path}`;

  if (entry.type === "reordered") {
    return `${head}\n    ${entry.detail ?? "member order differs"}`;
  }

  if (entry.type === "added") {
    return `${head}\n    + ${previewValue(entry.after)}`;
  }

  if (entry.type === "removed") {
    return `${head}\n    - ${previewValue(entry.before)}`;
  }

  return `${head}\n    - ${previewValue(entry.before)}\n    + ${previewValue(entry.after)}`;
}

/** Renders the full report text. An empty comparison still gets a report. */
export function buildDiffReport(result: DiffResult): string {
  const sections: string[] = [
    "DevTinyTools JSON diff report",
    "=============================",
    "",
    countsLine(result),
    "",
  ];

  if (result.total === 0) {
    sections.push("The two documents are equivalent under the comparison settings used.");
  } else {
    sections.push(...result.entries.map(entryLine));
  }

  if (result.truncated) {
    sections.push(
      "",
      `Note: the list was cut off at ${result.entries.length} entries. Re-run the comparison with narrower documents to capture the rest.`,
    );
  }

  return `${sections.join("\n")}\n`;
}
