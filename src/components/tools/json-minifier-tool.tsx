"use client";

import { useState } from "react";
import { JsonTextArea } from "@/components/ui/json-textarea";
import { JsonErrorPanel } from "@/components/ui/json-error-panel";
import { Notice } from "@/components/ui/notice";
import { buttonClass } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { downloadTextFile, timestampedFilename } from "@/lib/download";
import { MINIFIER_EXAMPLE } from "@/lib/examples";
import {
  formatBytes,
  formatCount,
  getCompressionStats,
  minifyJson,
  utf8ByteLength,
  type JsonErrorInfo,
} from "@/lib/json-utils";

interface Status {
  tone: "success" | "error" | "info";
  title: string;
  detail?: string;
}

const BYTE_LIMIT = 200_000;

export function JsonMinifierTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<JsonErrorInfo | null>(null);

  const stats = output ? getCompressionStats(input, output) : null;
  const beforeBytes = input.length > 0 && input.length <= BYTE_LIMIT ? utf8ByteLength(input) : null;
  const afterBytes =
    output.length > 0 && output.length <= BYTE_LIMIT ? utf8ByteLength(output) : null;

  function handleMinify() {
    setError(null);

    if (!input.trim()) {
      setOutput("");
      setStatus({
        tone: "error",
        title: "The input is empty",
        detail: "Paste JSON or load the example to see how much space can be saved.",
      });
      return;
    }

    const result = minifyJson(input);

    if (!result.ok) {
      setOutput("");
      setError(result.error);
      setStatus({
        tone: "error",
        title: "This JSON could not be minified",
        detail: "The input has a syntax error, so there is no safe output to produce.",
      });
      return;
    }

    setOutput(result.output);
    const saved = getCompressionStats(input, result.output);

    setStatus(
      saved.saved === 0
        ? {
            tone: "info",
            title: "Already minified",
            detail: "There was no removable whitespace in this document.",
          }
        : {
            tone: "success",
            title: `Removed ${formatCount(saved.saved)} characters (${saved.savedPercent}%)`,
            detail: `The minified document is ${formatCount(
              saved.after,
            )} characters and parses to the same data as the input.`,
          },
    );
  }

  async function handleCopy() {
    if (!output) {
      setStatus({
        tone: "error",
        title: "Nothing to copy",
        detail: "Run Minify first.",
      });
      return;
    }

    const copied = await copyText(output);
    setStatus(
      copied
        ? {
            tone: "success",
            title: "Minified JSON copied",
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
      setStatus({
        tone: "error",
        title: "Nothing to download",
        detail: "Run Minify first.",
      });
      return;
    }

    const result = downloadTextFile(output, timestampedFilename("minified-json"));
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

  function handleClear() {
    setInput("");
    setOutput("");
    setError(null);
    setStatus({ tone: "info", title: "Cleared", detail: "The editor and the output are now empty." });
  }

  function handleLoadExample() {
    const result = minifyJson(MINIFIER_EXAMPLE);
    setInput(MINIFIER_EXAMPLE);
    setError(null);

    if (result.ok) {
      setOutput(result.output);
      const saved = getCompressionStats(MINIFIER_EXAMPLE, result.output);
      setStatus({
        tone: "info",
        title: "Example loaded",
        detail: `This sample shrinks by ${formatCount(saved.saved)} characters (${saved.savedPercent}%).`,
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleMinify} className={buttonClass("primary")}>
            Minify JSON
          </button>
          <button
            type="button"
            onClick={handleLoadExample}
            className={buttonClass("secondary")}
          >
            Load example
          </button>
          <button type="button" onClick={handleClear} className={buttonClass("ghost")}>
            Clear
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <JsonTextArea
          id="minify-input"
          label="Input"
          value={input}
          onChange={setInput}
          invalid={Boolean(error)}
          bodyClassName="h-[300px] lg:h-[420px]"
          placeholder={'Paste indented JSON here.\n\n{\n  "a": 1\n}'}
          meta={<span className="tabular-nums">{formatCount(input.length)} chars</span>}
        />

        <JsonTextArea
          id="minify-output"
          label="Minified output"
          value={output}
          readOnly
          bodyClassName="h-[300px] lg:h-[420px]"
          placeholder="The compact result appears here."
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

      {stats ? (
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-4">
          <StatCell
            label="Before"
            value={formatCount(stats.before)}
            hint={beforeBytes !== null ? formatBytes(beforeBytes) : "characters"}
          />
          <StatCell
            label="After"
            value={formatCount(stats.after)}
            hint={afterBytes !== null ? formatBytes(afterBytes) : "characters"}
          />
          <StatCell label="Characters saved" value={formatCount(stats.saved)} hint="whitespace" />
          <StatCell
            label="Reduction"
            value={`${stats.savedPercent}%`}
            hint="vs. your input"
          />
        </dl>
      ) : null}

      <div aria-live="polite" className="space-y-3">
        {status ? (
          <Notice tone={status.tone} title={status.title}>
            {status.detail ? <p>{status.detail}</p> : null}
          </Notice>
        ) : null}
        {error ? <JsonErrorPanel error={error} /> : null}
      </div>

      <p className="border-t border-slate-200 pt-3 text-xs text-slate-500">
        Character counts are measured on the text exactly as entered. Byte counts are
        UTF-8 encoded sizes, which is what a network response or file on disk would use.
      </p>
    </div>
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
