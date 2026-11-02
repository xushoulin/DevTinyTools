"use client";

import { useMemo, useState, type ReactNode } from "react";

import { buttonClass } from "@/components/ui/button";
import { JsonTextArea } from "@/components/ui/json-textarea";
import { Notice } from "@/components/ui/notice";
import { copyText } from "@/lib/clipboard";
import { downloadTextFile, timestampedFilename } from "@/lib/download";
import { ESCAPE_EXAMPLE, UNESCAPE_EXAMPLE } from "@/lib/examples";
import {
  DEFAULT_ESCAPE_OPTIONS,
  escapeJsonString,
  unescapeJsonString,
  type EscapeOptions,
} from "@/lib/json-escape";
import { formatBytes, formatCount, utf8ByteLength } from "@/lib/json-utils";

type Mode = "escape" | "unescape";

interface Status {
  tone: "success" | "error" | "info";
  title: string;
  detail?: string;
}

const OPTION_LABELS: Array<{ key: keyof EscapeOptions; label: string; hint: string }> = [
  {
    key: "wrapInQuotes",
    label: "Include the surrounding quotes",
    hint: "The result can be pasted straight into a JSON document as a value.",
  },
  {
    key: "escapeNonAscii",
    label: "Escape non-ASCII as \\uXXXX",
    hint: "What Python does by default. Makes every character ASCII, and the payload larger.",
  },
  {
    key: "escapeSlash",
    label: "Escape / as \\/",
    hint: "What PHP does by default. JSON does not require it.",
  },
];

export function JsonEscapeTool() {
  const [mode, setMode] = useState<Mode>("escape");
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<EscapeOptions>(DEFAULT_ESCAPE_OPTIONS);
  const [status, setStatus] = useState<Status | null>(null);

  const decoded = useMemo(() => unescapeJsonString(input), [input]);
  const encoded = useMemo(() => escapeJsonString(input, options), [input, options]);

  const output = input.length === 0 ? "" : mode === "escape" ? encoded : decoded.value;

  const beforeBytes = input.length > 0 ? utf8ByteLength(input) : null;
  const afterBytes = output.length > 0 ? utf8ByteLength(output) : null;

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setStatus(null);
  }

  function handleSwap() {
    if (!output) {
      setStatus({
        tone: "error",
        title: "Nothing to swap",
        detail: "Paste something first.",
      });
      return;
    }
    setInput(output);
    setMode(mode === "escape" ? "unescape" : "escape");
    setStatus({
      tone: "info",
      title: "Output moved to the input",
      detail:
        mode === "escape"
          ? "The escaped text is now the input, so you can check it decodes back."
          : "The plain text is now the input, ready to be escaped again.",
    });
  }

  function handleClear() {
    setInput("");
    setStatus({ tone: "info", title: "Cleared", detail: "Both panels are empty." });
  }

  function handleExample() {
    setInput(mode === "escape" ? ESCAPE_EXAMPLE : UNESCAPE_EXAMPLE);
    setStatus({
      tone: "info",
      title: "Example loaded",
      detail:
        mode === "escape"
          ? "Raw text with quotes, a Windows path, a tab and an emoji."
          : "An escaped string that also contains \\x41, which JSON does not define.",
    });
  }

  async function handleCopy() {
    if (!output) {
      setStatus({ tone: "error", title: "Nothing to copy", detail: "Paste something first." });
      return;
    }
    const copied = await copyText(output);
    setStatus(
      copied
        ? {
            tone: "success",
            title: "Copied",
            detail: `${formatCount(output.length)} characters are on your clipboard.`,
          }
        : {
            tone: "error",
            title: "Copy was blocked",
            detail:
              "Your browser did not allow clipboard access. Select the output and press ⌘/Ctrl + C instead.",
          },
    );
  }

  function handleDownload() {
    if (!output) {
      setStatus({ tone: "error", title: "Nothing to download", detail: "Paste something first." });
      return;
    }
    const result = downloadTextFile(
      output,
      timestampedFilename(mode === "escape" ? "escaped-json" : "unescaped-text"),
    );
    setStatus(
      result.ok
        ? { tone: "success", title: "Download started", detail: `Saved as ${result.filename}.` }
        : {
            tone: "error",
            title: "Download failed",
            detail:
              "Your browser blocked the file download. Copy the output and save it from a text editor instead.",
          },
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Direction"
            className="flex rounded-md border border-slate-300 p-0.5"
          >
            <ModeTab active={mode === "escape"} onClick={() => switchMode("escape")}>
              Escape
            </ModeTab>
            <ModeTab active={mode === "unescape"} onClick={() => switchMode("unescape")}>
              Unescape
            </ModeTab>
          </div>
          <button type="button" onClick={handleExample} className={buttonClass("secondary")}>
            Load example
          </button>
          <button type="button" onClick={handleSwap} className={buttonClass("secondary")}>
            Swap
          </button>
          <button type="button" onClick={handleClear} className={buttonClass("ghost")}>
            Clear
          </button>
        </div>

        {mode === "escape" ? (
          <fieldset className="mt-3 border-t border-slate-200 pt-3">
            <legend className="sr-only">Escaping options</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {OPTION_LABELS.map((option) => (
                <label
                  key={option.key}
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 px-2.5 py-2 hover:border-slate-300"
                >
                  <input
                    type="checkbox"
                    checked={options[option.key]}
                    onChange={(event) =>
                      setOptions((current) => ({
                        ...current,
                        [option.key]: event.target.checked,
                      }))
                    }
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-blue-600"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-slate-800">
                      {option.label}
                    </span>
                    <span className="block text-[11px] leading-snug text-slate-500">
                      {option.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <JsonTextArea
          id="escape-input"
          label={mode === "escape" ? "Plain text" : "Escaped string"}
          value={input}
          onChange={setInput}
          bodyClassName="h-[280px] lg:h-[380px]"
          placeholder={
            mode === "escape"
              ? 'Paste raw text.\n\nHe said "hi" and left.\nPath: C:\\Users\\ada'
              : 'Paste an escaped string, with or without quotes.\n\n"He said \\"hi\\"\\nPath: C:\\\\Users"'
          }
          meta={<span className="tabular-nums">{formatCount(input.length)} chars</span>}
        />

        <JsonTextArea
          id="escape-output"
          label={mode === "escape" ? "Escaped for JSON" : "Plain text"}
          value={output}
          readOnly
          bodyClassName="h-[280px] lg:h-[380px]"
          placeholder={
            mode === "escape"
              ? "The escaped string appears here as you type."
              : "The decoded text appears here as you type."
          }
          meta={<span className="tabular-nums">{formatCount(output.length)} chars</span>}
          actions={
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-800"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-800"
              >
                Download
              </button>
            </span>
          }
        />
      </div>

      {beforeBytes !== null && afterBytes !== null ? (
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-4">
          <StatCell
            label="Input"
            value={formatCount(input.length)}
            hint={`${formatBytes(beforeBytes)} in UTF-8`}
          />
          <StatCell
            label="Output"
            value={formatCount(output.length)}
            hint={`${formatBytes(afterBytes)} in UTF-8`}
          />
          <StatCell
            label="Change"
            value={`${output.length >= input.length ? "+" : ""}${formatCount(
              output.length - input.length,
            )}`}
            hint="characters"
          />
          <StatCell
            label="How it was read"
            value={mode === "escape" ? "Written" : decoded.strict ? "Strict" : "Repaired"}
            hint={
              mode === "escape"
                ? "same rules as JSON.stringify"
                : decoded.strict
                  ? "by the browser parser"
                  : "not valid JSON, see below"
            }
          />
        </dl>
      ) : null}

      <div aria-live="polite" className="space-y-3">
        {status ? (
          <Notice tone={status.tone} title={status.title}>
            {status.detail ? <p>{status.detail}</p> : null}
          </Notice>
        ) : null}

        {mode === "unescape" && input.length > 0 && !decoded.strict ? (
          <Notice tone="info" title="This input is not valid JSON, so it was repaired">
            <p>
              The browser parser refused it with{" "}
              <code className="font-mono text-[12px] text-slate-800">{decoded.strictError}</code>
              , so the sequences below were decoded by hand. Your code will still throw on
              the same input.
            </p>
            <ul className="mt-2 space-y-1">
              {decoded.notes.map((note) => (
                <li key={note.sequence} className="flex flex-wrap items-baseline gap-x-2">
                  <code className="font-mono text-[12px] text-slate-800">{note.sequence}</code>
                  <span aria-hidden="true" className="text-slate-400">
                    &rarr;
                  </span>
                  <code className="font-mono text-[12px] text-slate-800">
                    {note.replacement === "" ? "(nothing)" : note.replacement}
                  </code>
                  <span className="text-[11px] text-slate-500">
                    {note.count === 1 ? "once" : `${note.count} times`}
                  </span>
                </li>
              ))}
            </ul>
          </Notice>
        ) : null}

        {mode === "unescape" && input.length > 0 && decoded.strict ? (
          <p className="text-xs text-slate-500">
            Decoded by the browser&apos;s own <code className="font-mono">JSON.parse</code>, so
            the result is exactly what your code would see.
          </p>
        ) : null}
      </div>

      <p className="border-t border-slate-200 pt-3 text-xs text-slate-500">
        Both directions run here in the tab. Byte counts are UTF-8 sizes, which is what a file
        or a network response would contain; escaping non-ASCII usually makes that number
        larger, not smaller.
      </p>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
        active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function StatCell({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-mono text-base text-slate-900">{value}</dd>
      <dd className="text-[11px] text-slate-400">{hint}</dd>
    </div>
  );
}
