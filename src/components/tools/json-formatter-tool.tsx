"use client";

import { useState, type KeyboardEvent } from "react";
import { JsonTextArea } from "@/components/ui/json-textarea";
import { JsonErrorPanel } from "@/components/ui/json-error-panel";
import { Notice } from "@/components/ui/notice";
import { buttonClass } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { downloadTextFile, timestampedFilename } from "@/lib/download";
import { FORMATTER_EXAMPLE } from "@/lib/examples";
import {
  formatCount,
  formatJson,
  getJsonType,
  minifyJson,
  parseJson,
  utf8ByteLength,
  type IndentSize,
  type JsonErrorInfo,
} from "@/lib/json-utils";

type Transform = "format" | "minify";

interface Status {
  tone: "success" | "error" | "info";
  title: string;
  detail?: string;
}

export function JsonFormatterTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [indent, setIndent] = useState<IndentSize>(2);
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<JsonErrorInfo | null>(null);
  const [lastTransform, setLastTransform] = useState<Transform | null>(null);

  function runTransform(mode: Transform) {
    setError(null);

    if (!input.trim()) {
      setOutput("");
      setLastTransform(null);
      setStatus({
        tone: "error",
        title: "The input is empty",
        detail: "Paste some JSON, or use “Load example” to start from a sample document.",
      });
      return;
    }

    const result = mode === "format" ? formatJson(input, indent) : minifyJson(input);

    if (!result.ok) {
      setOutput("");
      setLastTransform(null);
      setError(result.error);
      setStatus({
        tone: "error",
        title:
          mode === "format"
            ? "This JSON could not be formatted"
            : "This JSON could not be minified",
        detail: "Fix the syntax problem below and run the tool again.",
      });
      return;
    }

    setOutput(result.output);
    setLastTransform(mode);
    setStatus({
      tone: "success",
      title:
        mode === "format"
          ? `Formatted with ${indent}-space indentation`
          : "Minified",
      detail: `Output: ${formatCount(result.output.length)} characters.`,
    });
  }

  function handleValidate() {
    setError(null);

    if (!input.trim()) {
      setStatus({
        tone: "error",
        title: "The input is empty",
        detail: "There is nothing to validate yet.",
      });
      return;
    }

    const parsed = parseJson(input);

    if (!parsed.ok) {
      setError(parsed.error);
      setStatus({
        tone: "error",
        title: "Invalid JSON",
        detail: "See the parser message below for the reported location.",
      });
      return;
    }

    const type = getJsonType(parsed.value);
    setStatus({
      tone: "success",
      title: "Valid JSON",
      detail: `The document parses successfully. Top-level type: ${type}.`,
    });
  }

  async function handleCopy() {
    if (!output) {
      setStatus({
        tone: "error",
        title: "Nothing to copy",
        detail: "Run Format or Minify first.",
      });
      return;
    }

    const copied = await copyText(output);
    setStatus(
      copied
        ? {
            tone: "success",
            title: "Output copied",
            detail: `${formatCount(output.length)} characters are on your clipboard.`,
          }
        : {
            tone: "error",
            title: "Copy was blocked",
            detail:
              "Your browser did not allow clipboard access. Select the output panel and press ⌘/Ctrl + C instead.",
          },
    );
  }

  function handleDownload() {
    if (!output) {
      setStatus({
        tone: "error",
        title: "Nothing to download",
        detail: "Run Format or Minify first.",
      });
      return;
    }

    const filename = timestampedFilename(lastTransform === "minify" ? "minified-json" : "formatted-json");
    const result = downloadTextFile(output, filename);

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
    setLastTransform(null);
    setStatus({ tone: "info", title: "Cleared", detail: "The editor and the output are now empty." });
  }

  function handleLoadExample() {
    const result = formatJson(FORMATTER_EXAMPLE, indent);
    setInput(FORMATTER_EXAMPLE);
    setError(null);

    if (result.ok) {
      setOutput(result.output);
      setLastTransform("format");
      setStatus({
        tone: "info",
        title: "Example loaded",
        detail: "A compact JSON document was loaded and formatted so you can see the difference.",
      });
    }
  }

  function handleSwap() {
    if (!output) {
      setStatus({
        tone: "error",
        title: "Nothing to swap",
        detail: "Run Format or Minify first, then you can move the output into the input.",
      });
      return;
    }

    setInput(output);
    setOutput(input);
    setError(null);
    setLastTransform(null);
    setStatus({
      tone: "info",
      title: "Input and output swapped",
      detail: "The previous output is now in the input editor.",
    });
  }

  function handleIndentChange(value: string) {
    const next: IndentSize = value === "4" ? 4 : 2;
    setIndent(next);

    if (lastTransform === "format" && output) {
      const result = formatJson(input, next);
      if (result.ok) {
        setOutput(result.output);
        setStatus({
          tone: "success",
          title: `Reformatted with ${next}-space indentation`,
        });
      }
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      runTransform("format");
    }
  }

  const inputBytes = input.length <= 200_000 ? utf8ByteLength(input) : null;
  const outputBytes = output.length <= 200_000 ? utf8ByteLength(output) : null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => runTransform("format")}
              className={buttonClass("primary")}
            >
              Format JSON
            </button>
            <button
              type="button"
              onClick={() => runTransform("minify")}
              className={buttonClass("secondary")}
            >
              Minify
            </button>
            <button
              type="button"
              onClick={handleValidate}
              className={buttonClass("secondary")}
            >
              Validate
            </button>
            <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />
            <button
              type="button"
              onClick={handleLoadExample}
              className={buttonClass("ghost")}
            >
              Load example
            </button>
            <button type="button" onClick={handleClear} className={buttonClass("ghost")}>
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="indent" className="text-xs font-medium text-slate-600">
              Indent
            </label>
            <select
              id="indent"
              value={indent}
              onChange={(event) => handleIndentChange(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700"
            >
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2" onKeyDown={handleKeyDown}>
        <JsonTextArea
          id="json-input"
          label="Input"
          value={input}
          onChange={setInput}
          invalid={Boolean(error)}
          describedBy="formatter-status"
          placeholder={'Paste JSON here, for example:\n\n{"name":"DevTinyTools","tools":["formatter"]}'}
          meta={<span className="tabular-nums">{formatCount(input.length)} chars</span>}
        />

        <JsonTextArea
          id="json-output"
          label="Output"
          value={output}
          readOnly
          bodyClassName="h-[300px] lg:h-[440px]"
          placeholder="The formatted result appears here."
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
              <button
                type="button"
                onClick={handleSwap}
                className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-800"
              >
                Swap
              </button>
            </span>
          }
        />
      </div>

      <div id="formatter-status" className="space-y-3">
        {status ? (
          <Notice tone={status.tone} title={status.title}>
            {status.detail ? <p>{status.detail}</p> : null}
          </Notice>
        ) : null}
        {error ? <JsonErrorPanel error={error} /> : null}
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Tip: press <kbd className="rounded border border-slate-300 bg-white px-1 font-mono text-[11px]">⌘/Ctrl</kbd>{" "}
          + <kbd className="rounded border border-slate-300 bg-white px-1 font-mono text-[11px]">Enter</kbd> to format.
        </p>
        <p className="tabular-nums">
          {formatCount(input.length)} chars in
          {inputBytes !== null ? ` · ${formatCount(inputBytes)} bytes` : ""}
          {output
            ? ` · ${formatCount(output.length)} chars out${
                outputBytes !== null ? ` · ${formatCount(outputBytes)} bytes` : ""
              }`
            : ""}
        </p>
      </div>
    </div>
  );
}
