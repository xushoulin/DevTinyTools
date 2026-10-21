"use client";

import { useEffect, useRef, useState } from "react";
import { JsonTextArea } from "@/components/ui/json-textarea";
import { JsonErrorPanel } from "@/components/ui/json-error-panel";
import { buttonClass } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { VALIDATOR_INVALID_EXAMPLE, VALIDATOR_VALID_EXAMPLE } from "@/lib/examples";
import {
  analyzeJson,
  formatCount,
  formatBytes,
  parseJson,
  utf8ByteLength,
  type JsonErrorInfo,
  type JsonStats,
} from "@/lib/json-utils";

/** Auto-checking very large documents would make typing feel sluggish. */
const LIVE_CHECK_LIMIT = 100_000;

type Result =
  | { state: "idle" }
  | { state: "valid"; stats: JsonStats; chars: number; bytes: number | null }
  | { state: "invalid"; error: JsonErrorInfo };

function checkDocument(text: string): Result {
  const parsed = parseJson(text);
  if (!parsed.ok) return { state: "invalid", error: parsed.error };

  return {
    state: "valid",
    stats: analyzeJson(parsed.value),
    chars: text.length,
    bytes: text.length <= 200_000 ? utf8ByteLength(text) : null,
  };
}

export function JsonValidatorTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result>({ state: "idle" });
  const [liveCheck, setLiveCheck] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  function cancelPendingCheck() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  /** Typing drives the debounce directly, so no effect needs to watch `input`. */
  function handleInputChange(value: string) {
    setInput(value);

    if (!liveCheck) return;

    cancelPendingCheck();

    if (!value.trim()) {
      setResult({ state: "idle" });
      return;
    }

    if (value.length > LIVE_CHECK_LIMIT) return;

    timerRef.current = window.setTimeout(() => {
      setResult(checkDocument(value));
      timerRef.current = null;
    }, 400);
  }

  function handleLiveCheckToggle(checked: boolean) {
    setLiveCheck(checked);
    cancelPendingCheck();

    if (!checked) return;

    setResult(input.trim() ? checkDocument(input) : { state: "idle" });
  }

  function handleValidate() {
    cancelPendingCheck();
    setMessage(null);
    setResult(checkDocument(input));
  }

  function handleClear() {
    cancelPendingCheck();
    setInput("");
    setResult({ state: "idle" });
    setMessage(null);
  }

  function handleValidExample() {
    cancelPendingCheck();
    setInput(VALIDATOR_VALID_EXAMPLE);
    setResult(checkDocument(VALIDATOR_VALID_EXAMPLE));
    setMessage("Loaded a valid configuration file.");
  }

  function handleInvalidExample() {
    cancelPendingCheck();
    setInput(VALIDATOR_INVALID_EXAMPLE);
    setResult(checkDocument(VALIDATOR_INVALID_EXAMPLE));
    setMessage("Loaded a deliberately broken sample with a trailing comma.");
  }

  async function handleCopy() {
    if (!input) {
      setMessage("There is nothing to copy yet.");
      return;
    }

    const copied = await copyText(input);
    setMessage(
      copied
        ? `Copied ${formatCount(input.length)} characters.`
        : "Copy was blocked by the browser. Select the text and press ⌘/Ctrl + C instead.",
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleValidate}
              className={buttonClass("primary")}
            >
              Validate JSON
            </button>
            <button
              type="button"
              onClick={handleValidExample}
              className={buttonClass("secondary")}
            >
              Valid example
            </button>
            <button
              type="button"
              onClick={handleInvalidExample}
              className={buttonClass("secondary")}
            >
              Broken example
            </button>
            <button type="button" onClick={handleCopy} className={buttonClass("ghost")}>
              Copy JSON
            </button>
            <button type="button" onClick={handleClear} className={buttonClass("ghost")}>
              Clear
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={liveCheck}
              onChange={(event) => handleLiveCheckToggle(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            Check as I type
          </label>
        </div>
      </div>

      <JsonTextArea
        id="validator-input"
        label="JSON to validate"
        value={input}
        onChange={handleInputChange}
        invalid={result.state === "invalid"}
        bodyClassName="h-[320px] lg:h-[360px]"
        placeholder={'Paste the document you want to check.\n\n{"status":"ok","items":[1,2,3]}'}
        meta={<span className="tabular-nums">{formatCount(input.length)} chars</span>}
      />

      <div aria-live="polite" className="space-y-3">
        {message ? (
          <p className="text-xs text-slate-500">{message}</p>
        ) : null}

        {result.state === "idle" ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white/60 px-4 py-6 text-center text-sm text-slate-500">
            No result yet. Paste a document and press{" "}
            <span className="font-medium text-slate-700">Validate JSON</span>, or turn on
            “Check as I type”.
          </div>
        ) : null}

        {result.state === "invalid" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-800">This document is not valid JSON</p>
            <JsonErrorPanel error={result.error} />
          </div>
        ) : null}

        {result.state === "valid" ? (
          <div className="rounded-lg border border-emerald-200 bg-white">
            <div className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50 px-4 py-2.5">
              <span
                aria-hidden="true"
                className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white"
              >
                ✓
              </span>
              <p className="text-sm font-medium text-emerald-900">Valid JSON</p>
            </div>

            <dl className="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-3">
              <Stat label="Top-level type" value={result.stats.type} />
              <Stat label="Nesting depth" value={`${result.stats.depth}`} />
              <Stat label="Values parsed" value={formatCount(result.stats.nodes)} />
              <Stat label="Object keys" value={formatCount(result.stats.keys)} />
              <Stat label="Array items" value={formatCount(result.stats.arrayItems)} />
              <Stat
                label="Document size"
                value={
                  result.bytes !== null
                    ? `${formatCount(result.chars)} chars · ${formatBytes(result.bytes)}`
                    : `${formatCount(result.chars)} chars`
                }
              />
            </dl>

            {result.stats.truncated ? (
              <p className="border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">
                The structure summary stopped early because this document contains an
                unusually large number of values. The syntax check itself covered the
                whole document.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm text-slate-900">{value}</dd>
    </div>
  );
}
