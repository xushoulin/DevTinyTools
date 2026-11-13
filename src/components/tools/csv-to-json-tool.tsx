"use client";

import { useState } from "react";
import Link from "next/link";
import { JsonTextArea } from "@/components/ui/json-textarea";
import { Notice } from "@/components/ui/notice";
import { buttonClass } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { downloadTextFile, timestampedFilename } from "@/lib/download";
import { CSV_TO_JSON_EXAMPLE } from "@/lib/examples";
import { formatCount } from "@/lib/json-utils";
import {
  CSV_INPUT_DELIMITERS,
  csvToJson,
  type CsvInputDelimiter,
  type CsvToJsonSuccess,
} from "@/lib/csv-to-json";
import { useProUnlocked } from "@/lib/license";
import { CSV_FREE_CHAR_LIMIT, CSV_PRO_CHAR_LIMIT, getProCheckoutUrl } from "@/lib/pro";

interface Status {
  tone: "success" | "error" | "info";
  title: string;
  detail?: string;
}

export function CsvToJsonTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [result, setResult] = useState<CsvToJsonSuccess | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [delimiter, setDelimiter] = useState<CsvInputDelimiter>("auto");
  const [header, setHeader] = useState(true);
  const [inferTypes, setInferTypes] = useState(true);
  const [unflatten, setUnflatten] = useState(true);

  const checkoutUrl = getProCheckoutUrl();
  // Hydration-safe: the server snapshot is unlicensed; the client reads
  // localStorage after mount.
  const proActive = useProUnlocked();
  const limit =
    !checkoutUrl || proActive ? CSV_PRO_CHAR_LIMIT : CSV_FREE_CHAR_LIMIT;
  const overLimit = input.length > limit;

  function handleConvert() {
    setResult(null);
    setOutput("");

    if (!input.trim()) {
      setStatus({
        tone: "error",
        title: "The input is empty",
        detail: "Paste CSV text, or load the example to see the output shape.",
      });
      return;
    }

    if (overLimit) {
      setStatus({
        tone: "info",
        title: `This document is ${formatCount(input.length)} characters`,
        detail: `Free conversion covers up to ${formatCount(CSV_FREE_CHAR_LIMIT)}. DevTinyTools Pro raises the cap to ${formatCount(CSV_PRO_CHAR_LIMIT)}.`,
      });
      return;
    }

    const converted = csvToJson(input, { delimiter, header, inferTypes, unflatten });

    if (!converted.ok) {
      setStatus({
        tone: "error",
        title: "This CSV could not be parsed",
        detail: converted.error,
      });
      return;
    }

    setResult(converted);
    setOutput(converted.json);
    const warningSuffix = converted.warnings.length > 0 ? ` · ${converted.warnings.length} warning(s) below` : "";
    setStatus({
      tone: converted.warnings.length > 0 ? "info" : "success",
      title: `${formatCount(converted.rows)} ${converted.rows === 1 ? "record" : "records"}, ${converted.columns.length} columns${warningSuffix}`,
      detail:
        "Numbers were only converted where the text round-trips exactly — values like 19.50 or 15-digit IDs stay strings, so nothing you exported is silently rewritten.",
    });
  }

  async function handleCopy() {
    if (!output) {
      setStatus({ tone: "error", title: "Nothing to copy", detail: "Run Convert first." });
      return;
    }

    const copied = await copyText(output);
    setStatus(
      copied
        ? {
            tone: "success",
            title: "JSON copied",
            detail: `${formatCount(output.length)} characters are on your clipboard.`,
          }
        : {
            tone: "error",
            title: "Copy was blocked",
            detail: "Your browser did not allow clipboard access. Select the output and press ⌘/Ctrl + C instead.",
          },
    );
  }

  function handleDownload() {
    if (!output) {
      setStatus({ tone: "error", title: "Nothing to download", detail: "Run Convert first." });
      return;
    }

    const download = downloadTextFile(output, timestampedFilename("converted"), "application/json;charset=utf-8");
    setStatus(
      download.ok
        ? { tone: "success", title: "Download started", detail: `Saved as ${download.filename}.` }
        : {
            tone: "error",
            title: "Download failed",
            detail: "Your browser blocked the download. Copy the JSON into a .json file instead.",
          },
    );
  }

  function handleClear() {
    setInput("");
    setOutput("");
    setResult(null);
    setStatus({ tone: "info", title: "Cleared", detail: "The editor and the output are now empty." });
  }

  function handleLoadExample() {
    setInput(CSV_TO_JSON_EXAMPLE);
    setStatus({
      tone: "info",
      title: "Example loaded",
      detail: "Quotes, empty cells and ambiguous numbers included — press Convert to see how each one lands.",
    });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setInput(text);
      setResult(null);
      setOutput("");
      setStatus({
        tone: "info",
        title: `${file.name} loaded`,
        detail: `${formatCount(text.length)} characters read locally. Nothing was uploaded — press Convert.`,
      });
    };
    reader.onerror = () => {
      setStatus({
        tone: "error",
        title: "The file could not be read",
        detail: "Your browser refused the FileReader call. Paste the CSV text instead.",
      });
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleConvert} className={buttonClass("primary")}>
            Convert to JSON
          </button>
          <button type="button" onClick={handleLoadExample} className={buttonClass("secondary")}>
            Load example
          </button>
          <label className={buttonClass("secondary")}>
            Open a .csv file
            <input
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/plain"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
          <button type="button" onClick={handleClear} className={buttonClass("ghost")}>
            Clear
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-[13px] text-slate-700">
          <label className="flex items-center gap-2">
            <span className="text-slate-500">Delimiter</span>
            <select
              value={delimiter}
              onChange={(event) => setDelimiter(event.target.value as CsvInputDelimiter)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-[13px] text-slate-800"
            >
              {CSV_INPUT_DELIMITERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={header}
              onChange={(event) => setHeader(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            First row is column names
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={inferTypes}
              onChange={(event) => setInferTypes(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            Infer numbers and booleans
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={unflatten}
              onChange={(event) => setUnflatten(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            Unflatten dotted headers
          </label>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <JsonTextArea
          id="csv-to-json-input"
          label="CSV input"
          value={input}
          onChange={setInput}
          bodyClassName="h-[300px] lg:h-[420px]"
          placeholder={'Paste CSV text here.\n\nid,name\n1,"Ada"\n2,"Grace"'}
          meta={<span className="tabular-nums">{formatCount(input.length)} chars</span>}
        />

        <JsonTextArea
          id="csv-to-json-output"
          label="JSON output"
          value={output}
          readOnly
          bodyClassName="h-[300px] lg:h-[420px]"
          placeholder="The converted records appear here."
          meta={
            result ? (
              <span className="tabular-nums">
                {formatCount(result.rows)} records · {result.columns.length} columns
              </span>
            ) : (
              <span className="tabular-nums">{formatCount(output.length)} chars</span>
            )
          }
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

      {result && result.warnings.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          <p className="font-semibold">Notes on this conversion</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div aria-live="polite" className="space-y-3">
        {status ? (
          <Notice tone={status.tone} title={status.title}>
            <p>{status.detail}</p>
            {overLimit && checkoutUrl ? (
              <p className="mt-2">
                <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
                  Upgrade to Pro
                </a>
              </p>
            ) : null}
          </Notice>
        ) : null}
      </div>

      <p className="border-t border-slate-200 pt-3 text-xs text-slate-500">
        Free conversion covers up to {formatCount(limit)} characters per document —{" "}
        <Link href="/csv-to-json#pro" className="underline underline-offset-2">
          what Pro adds
        </Link>
        . The file you open is read locally by your browser; nothing is uploaded.
      </p>
    </div>
  );
}
