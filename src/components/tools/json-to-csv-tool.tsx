"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { JsonTextArea } from "@/components/ui/json-textarea";
import { JsonErrorPanel } from "@/components/ui/json-error-panel";
import { Notice } from "@/components/ui/notice";
import { buttonClass } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { downloadTextFile, timestampedFilename } from "@/lib/download";
import { CSV_EXAMPLE } from "@/lib/examples";
import { formatCount, parseJson, type JsonErrorInfo } from "@/lib/json-utils";
import {
  CSV_DELIMITERS,
  jsonValueToCsv,
  type CsvDelimiter,
  type CsvSuccess,
} from "@/lib/csv";
import {
  CSV_FREE_CHAR_LIMIT,
  CSV_PRO_CHAR_LIMIT,
  getProCheckoutUrl,
} from "@/lib/pro";

interface Status {
  tone: "success" | "error" | "info";
  title: string;
  detail?: string;
}

export function JsonToCsvTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [result, setResult] = useState<CsvSuccess | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<JsonErrorInfo | null>(null);
  const [delimiter, setDelimiter] = useState<CsvDelimiter>(",");
  const [flattenObjects, setFlattenObjects] = useState(true);
  const [includeHeader, setIncludeHeader] = useState(true);

  const checkoutUrl = getProCheckoutUrl();
  const limit = checkoutUrl ? CSV_FREE_CHAR_LIMIT : CSV_PRO_CHAR_LIMIT;
  const overLimit = input.length > limit;

  // Converting a million characters on every keystroke would freeze the tab;
  // the parsed shape is only needed on demand.
  const preview = useMemo(() => {
    if (!result) return null;
    const lines = result.csv.split("\r\n").filter((line) => line.length > 0);
    return lines.slice(0, 6).join("\n");
  }, [result]);

  function handleConvert() {
    setError(null);
    setResult(null);
    setOutput("");

    if (!input.trim()) {
      setStatus({
        tone: "error",
        title: "The input is empty",
        detail: "Paste a JSON array, or load the example to see the output shape.",
      });
      return;
    }

    if (overLimit) {
      setStatus({
        tone: "info",
        title: `This document is ${formatCount(input.length)} characters`,
        detail:
          checkoutUrl
            ? `Free conversion covers up to ${formatCount(CSV_FREE_CHAR_LIMIT)}. DevTinyTools Pro raises the cap to ${formatCount(CSV_PRO_CHAR_LIMIT)}.`
            : `Conversion covers up to ${formatCount(limit)} characters in the browser. A Pro tier that raises the cap is launching soon.`,
      });
      return;
    }

    const parsed = parseJson(input);
    if (!parsed.ok) {
      setError(parsed.error);
      setStatus({
        tone: "error",
        title: "This JSON could not be converted",
        detail: "The input has a syntax error, so there is no table to build.",
      });
      return;
    }

    const converted = jsonValueToCsv(parsed.value, {
      delimiter,
      flattenObjects,
      includeHeader,
    });

    if (!converted.ok) {
      setStatus({
        tone: "error",
        title: "This JSON cannot become a CSV table",
        detail: converted.error,
      });
      return;
    }

    setResult(converted);
    setOutput(converted.csv);
    setStatus({
      tone: "success",
      title: `${formatCount(converted.rows)} rows, ${converted.columns.length} columns`,
      detail:
        converted.rows === 1
          ? "Check the header row and column order before exporting — a one-row table is easy to read wrongly."
          : `Columns are the union of every row, in first-appearance order. Missing cells are left empty.`,
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
            title: "CSV copied",
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

    const download = downloadTextFile(output, timestampedFilename("converted"));
    setStatus(
      download.ok
        ? { tone: "success", title: "Download started", detail: `Saved as ${download.filename}.` }
        : {
            tone: "error",
            title: "Download failed",
            detail: "Your browser blocked the download. Copy the CSV into a .csv file instead.",
          },
    );
  }

  function handleClear() {
    setInput("");
    setOutput("");
    setResult(null);
    setError(null);
    setStatus({ tone: "info", title: "Cleared", detail: "The editor and the output are now empty." });
  }

  function handleLoadExample() {
    setInput(CSV_EXAMPLE);
    setError(null);
    setStatus({
      tone: "info",
      title: "Example loaded",
      detail: "An orders array with nested customers and string prices — press Convert to see the flattening.",
    });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setInput(text);
      setError(null);
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
        detail: "Your browser refused the FileReader call. Paste the JSON text instead.",
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
            Convert to CSV
          </button>
          <button type="button" onClick={handleLoadExample} className={buttonClass("secondary")}>
            Load example
          </button>
          <label className={buttonClass("secondary")}>
            Open a .json file
            <input
              type="file"
              accept=".json,application/json,text/plain"
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
              onChange={(event) => setDelimiter(event.target.value as CsvDelimiter)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-[13px] text-slate-800"
            >
              {CSV_DELIMITERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={flattenObjects}
              onChange={(event) => setFlattenObjects(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            Flatten nested objects into columns
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeHeader}
              onChange={(event) => setIncludeHeader(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            Include header row
          </label>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <JsonTextArea
          id="csv-input"
          label="JSON input"
          value={input}
          onChange={setInput}
          invalid={Boolean(error)}
          bodyClassName="h-[300px] lg:h-[420px]"
          placeholder={'Paste a JSON array here.\n\n[\n  { "id": 1, "name": "Ada" }\n]'}
          meta={<span className="tabular-nums">{formatCount(input.length)} chars</span>}
        />

        <JsonTextArea
          id="csv-output"
          label="CSV output"
          value={output}
          readOnly
          bodyClassName="h-[300px] lg:h-[420px]"
          placeholder="The converted table appears here."
          meta={
            result ? (
              <span className="tabular-nums">
                {formatCount(result.rows)} rows · {result.columns.length} columns
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

      {preview ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Preview · first rows
          </div>
          <pre className="overflow-x-auto px-3 py-2.5 font-mono text-[12px] leading-relaxed text-slate-800">
            <code>{preview}</code>
          </pre>
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
        {error ? <JsonErrorPanel error={error} /> : null}
      </div>

      <p className="border-t border-slate-200 pt-3 text-xs text-slate-500">
        Free conversion covers up to {formatCount(limit)} characters per document —{" "}
        <Link href="/json-to-csv#pro" className="underline underline-offset-2">
          what Pro adds
        </Link>
        . The file you open is read locally by your browser; nothing is uploaded.
      </p>
    </div>
  );
}
