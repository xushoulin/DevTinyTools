"use client";

import { useState } from "react";
import { JsonTextArea } from "@/components/ui/json-textarea";
import { buttonClass } from "@/components/ui/button";
import { DIFF_AFTER_EXAMPLE, DIFF_BEFORE_EXAMPLE } from "@/lib/examples";
import {
  DEFAULT_DIFF_OPTIONS,
  type DiffChangeType,
  type DiffEntry,
  type DiffOptions,
  type DiffResult,
  diffJson,
  previewValue,
} from "@/lib/json-diff";
import { formatCount, parseJson, type JsonErrorInfo } from "@/lib/json-utils";

interface SideErrors {
  before?: string;
  after?: string;
}

const BADGE: Record<DiffChangeType, string> = {
  added: "bg-emerald-100 text-emerald-800",
  removed: "bg-red-100 text-red-800",
  changed: "bg-amber-100 text-amber-900",
  reordered: "bg-slate-200 text-slate-700",
};

const BADGE_LABEL: Record<DiffChangeType, string> = {
  added: "added",
  removed: "removed",
  changed: "changed",
  reordered: "order",
};

function errorText(error: JsonErrorInfo): string {
  const location =
    error.line !== null
      ? ` (line ${error.line}${error.column !== null ? `, column ${error.column}` : ""})`
      : "";
  return `${error.message}${location}`;
}

export function JsonDiffTool() {
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [options, setOptions] = useState<DiffOptions>(DEFAULT_DIFF_OPTIONS);
  const [result, setResult] = useState<DiffResult | null>(null);
  const [errors, setErrors] = useState<SideErrors>({});
  const [message, setMessage] = useState<string | null>(null);

  /** Parses both sides and stores the outcome. Returns false if either is invalid. */
  function compute(beforeText: string, afterText: string, opts: DiffOptions): boolean {
    const parsedBefore = parseJson(beforeText);
    const parsedAfter = parseJson(afterText);

    const nextErrors: SideErrors = {};
    if (!parsedBefore.ok) nextErrors.before = errorText(parsedBefore.error);
    if (!parsedAfter.ok) nextErrors.after = errorText(parsedAfter.error);

    if (!parsedBefore.ok || !parsedAfter.ok) {
      setErrors(nextErrors);
      setResult(null);
      return false;
    }

    setErrors({});
    setResult(diffJson(parsedBefore.value, parsedAfter.value, opts));
    return true;
  }

  function handleCompare() {
    setMessage(null);
    const ok = compute(before, after, options);
    if (!ok) setMessage("Both sides have to be valid JSON before they can be compared.");
  }

  function handleExample() {
    setBefore(DIFF_BEFORE_EXAMPLE);
    setAfter(DIFF_AFTER_EXAMPLE);
    setMessage("Loaded a sample pair: a changed status, an edited quantity and an added item.");
    compute(DIFF_BEFORE_EXAMPLE, DIFF_AFTER_EXAMPLE, options);
  }

  function handleSwap() {
    const nextBefore = after;
    const nextAfter = before;
    setBefore(nextBefore);
    setAfter(nextAfter);
    setMessage("Swapped the two sides.");
    if (result !== null || errors.before || errors.after) {
      compute(nextBefore, nextAfter, options);
    }
  }

  function handleClear() {
    setBefore("");
    setAfter("");
    setResult(null);
    setErrors({});
    setMessage(null);
  }

  function handleOptionChange(next: DiffOptions) {
    setOptions(next);
    // Re-run immediately when the user has already compared, so a toggle feels
    // like a filter rather than a setting that needs another click.
    if (result !== null || errors.before || errors.after) {
      compute(before, after, next);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleCompare} className={buttonClass("primary")}>
              Compare JSON
            </button>
            <button type="button" onClick={handleExample} className={buttonClass("secondary")}>
              Example pair
            </button>
            <button type="button" onClick={handleSwap} className={buttonClass("ghost")}>
              Swap sides
            </button>
            <button type="button" onClick={handleClear} className={buttonClass("ghost")}>
              Clear
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={options.ignoreKeyOrder}
                onChange={(event) =>
                  handleOptionChange({ ...options, ignoreKeyOrder: event.target.checked })
                }
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              Ignore key order
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={options.ignoreArrayOrder}
                onChange={(event) =>
                  handleOptionChange({ ...options, ignoreArrayOrder: event.target.checked })
                }
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              Ignore array order
            </label>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <JsonTextArea
            id="diff-before"
            label="Original"
            value={before}
            onChange={setBefore}
            invalid={Boolean(errors.before)}
            bodyClassName="h-[240px] lg:h-[320px]"
            placeholder={'{"status":"pending","total":10}'}
            meta={<span className="tabular-nums">{formatCount(before.length)} chars</span>}
          />
          {errors.before ? (
            <p className="mt-1.5 text-xs text-red-700">{errors.before}</p>
          ) : null}
        </div>

        <div className="min-w-0">
          <JsonTextArea
            id="diff-after"
            label="Updated"
            value={after}
            onChange={setAfter}
            invalid={Boolean(errors.after)}
            bodyClassName="h-[240px] lg:h-[320px]"
            placeholder={'{"status":"shipped","total":10}'}
            meta={<span className="tabular-nums">{formatCount(after.length)} chars</span>}
          />
          {errors.after ? <p className="mt-1.5 text-xs text-red-700">{errors.after}</p> : null}
        </div>
      </div>

      <div aria-live="polite" className="space-y-3">
        {message ? <p className="text-xs text-slate-500">{message}</p> : null}

        {result === null ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white/60 px-4 py-6 text-center text-sm text-slate-500">
            No comparison yet. Paste two documents and press{" "}
            <span className="font-medium text-slate-700">Compare JSON</span>.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
              <p className="text-sm font-medium text-slate-900">
                {result.total === 0
                  ? "No differences"
                  : `${formatCount(result.total)} difference${result.total === 1 ? "" : "s"}`}
              </p>
              {result.counts.changed > 0 ? (
                <Count label="changed" value={result.counts.changed} />
              ) : null}
              {result.counts.added > 0 ? (
                <Count label="added" value={result.counts.added} />
              ) : null}
              {result.counts.removed > 0 ? (
                <Count label="removed" value={result.counts.removed} />
              ) : null}
              {result.counts.reordered > 0 ? (
                <Count label="reordered" value={result.counts.reordered} />
              ) : null}
            </div>

            {result.total === 0 ? (
              <p className="px-4 py-5 text-sm text-slate-600">
                The two documents are equivalent under the current settings
                {options.ignoreArrayOrder ? ", including array order" : ""}.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {result.entries.map((entry, index) => (
                  <Row key={`${entry.path}-${entry.type}-${index}`} entry={entry} />
                ))}
              </ul>
            )}

            {result.truncated ? (
              <p className="border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">
                Only the first {formatCount(result.total)} differences are listed. Narrow the
                documents down, or compare a subtree, to see the rest.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-600">
      {formatCount(value)} {label}
    </span>
  );
}

function Row({ entry }: { entry: DiffEntry }) {
  return (
    <li className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-start sm:gap-3">
      <span
        className={`mt-0.5 w-fit shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${BADGE[entry.type]}`}
      >
        {BADGE_LABEL[entry.type]}
      </span>

      <div className="min-w-0 flex-1">
        <code className="break-all font-mono text-[12px] text-slate-900">{entry.path}</code>

        {entry.type === "reordered" ? (
          <p className="mt-0.5 font-mono text-[11px] break-words text-slate-600">
            {entry.detail}
          </p>
        ) : (
          <>
            <p className="mt-0.5 font-mono text-[11px] break-words text-slate-600">
              {entry.type === "added" ? (
                <span className="text-emerald-700">+ {previewValue(entry.after)}</span>
              ) : entry.type === "removed" ? (
                <span className="text-red-700">− {previewValue(entry.before)}</span>
              ) : (
                <>
                  <span className="text-red-700">− {previewValue(entry.before)}</span>
                  <span className="mx-2 text-slate-400">→</span>
                  <span className="text-emerald-700">+ {previewValue(entry.after)}</span>
                </>
              )}
            </p>
            {entry.detail && entry.type !== "changed" ? (
              <p className="mt-0.5 text-[11px] text-slate-500">{entry.detail}</p>
            ) : null}
          </>
        )}
      </div>
    </li>
  );
}
