"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { JsonTextArea } from "@/components/ui/json-textarea";
import { JsonErrorPanel } from "@/components/ui/json-error-panel";
import { Notice } from "@/components/ui/notice";
import { buttonClass } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { downloadTextFile } from "@/lib/download";
import { GO_EXAMPLE } from "@/lib/examples";
import { formatCount, parseJson, type JsonErrorInfo } from "@/lib/json-utils";
import { inferType, type InferredType } from "@/lib/type-infer";
import { emitGo } from "@/lib/go-emit";
import { useProUnlocked } from "@/lib/license";
import { GO_FREE_CHAR_LIMIT, GO_PRO_CHAR_LIMIT, getProCheckoutUrl } from "@/lib/pro";

interface Status {
  tone: "success" | "error" | "info";
  title: string;
  detail?: string;
}

export function JsonToGoTool() {
  const [input, setInput] = useState("");
  const [inferred, setInferred] = useState<InferredType | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<JsonErrorInfo | null>(null);
  const [rootName, setRootName] = useState("Root");
  const [packageName, setPackageName] = useState("");
  const [omitempty, setOmitempty] = useState(true);

  const checkoutUrl = getProCheckoutUrl();
  const proActive = useProUnlocked();
  const proAvailable = !checkoutUrl || proActive;

  const limit = proAvailable ? GO_PRO_CHAR_LIMIT : GO_FREE_CHAR_LIMIT;
  const overLimit = input.length > limit;

  const result = useMemo(() => {
    if (!inferred) return null;
    return emitGo(inferred, { rootName, packageName, omitempty });
  }, [inferred, rootName, packageName, omitempty]);

  const output = result?.code ?? "";

  function handleGenerate() {
    setError(null);

    if (!input.trim()) {
      setStatus({
        tone: "error",
        title: "The input is empty",
        detail: "Paste a JSON object or array, or load the example to see the output.",
      });
      setInferred(null);
      return;
    }

    if (overLimit) {
      setInferred(null);
      setStatus({
        tone: "info",
        title: `This document is ${formatCount(input.length)} characters`,
        detail: `Free generation covers up to ${formatCount(GO_FREE_CHAR_LIMIT)}. DevTinyTools Pro raises the cap to ${formatCount(GO_PRO_CHAR_LIMIT)}.`,
      });
      return;
    }

    const parsed = parseJson(input);
    if (!parsed.ok) {
      setInferred(null);
      setError(parsed.error);
      setStatus({
        tone: "error",
        title: "This JSON could not be read",
        detail: "The input has a syntax error, so there is no shape to infer.",
      });
      return;
    }

    setInferred(inferType(parsed.value));

    const records = Array.isArray(parsed.value) ? parsed.value.length : 1;
    setStatus({
      tone: "success",
      title: "Structs generated",
      detail: Array.isArray(parsed.value)
        ? `${formatCount(records)} array ${records === 1 ? "element" : "elements"} sampled and merged. Keys that only some elements carry get ,omitempty; values that were ever null become pointers.`
        : "One object sampled. Nested objects were hoisted into their own structs.",
    });
  }

  async function handleCopy() {
    if (!output) {
      setStatus({ tone: "error", title: "Nothing to copy", detail: "Generate structs first." });
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
    if (!output || !result) {
      setStatus({ tone: "error", title: "Nothing to download", detail: "Generate structs first." });
      return;
    }

    const base = rootName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "structs";
    const download = downloadTextFile(output, `${base}.go`);
    setStatus(
      download.ok
        ? { tone: "success", title: "Download started", detail: `Saved as ${download.filename}.` }
        : {
            tone: "error",
            title: "Download failed",
            detail: "Your browser blocked the download. Copy the structs into a .go file instead.",
          },
    );
  }

  function handleClear() {
    setInput("");
    setInferred(null);
    setError(null);
    setStatus({ tone: "info", title: "Cleared", detail: "The editor and the output are now empty." });
  }

  function handleLoadExample() {
    setInput(GO_EXAMPLE);
    setInferred(null);
    setError(null);
    setRootName("Order");
    setStatus({
      tone: "info",
      title: "Example loaded",
      detail:
        "Two orders that disagree: the second omits unit_price, coupon_code is null once, and api_url shows the APIURL field name rule. Generate to see all three handled.",
    });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setInput(text);
      setInferred(null);
      setError(null);
      setStatus({
        tone: "info",
        title: `${file.name} loaded`,
        detail: `${formatCount(text.length)} characters read locally. Nothing was uploaded — press Generate.`,
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
          <button type="button" onClick={handleGenerate} className={buttonClass("primary")}>
            Generate Go structs
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

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-[13px] text-slate-700">
          <label className="flex items-center gap-2">
            <span className="text-slate-500">Root struct</span>
            <input
              type="text"
              value={rootName}
              onChange={(event) => setRootName(event.target.value)}
              spellCheck={false}
              className="w-32 rounded border border-slate-300 bg-white px-2 py-1 font-mono text-[12px] text-slate-800"
            />
          </label>

          <label className="flex items-center gap-2">
            <span className="text-slate-500">package</span>
            <input
              type="text"
              value={packageName}
              onChange={(event) => setPackageName(event.target.value)}
              spellCheck={false}
              placeholder="none"
              className="w-28 rounded border border-slate-300 bg-white px-2 py-1 font-mono text-[12px] text-slate-800"
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={omitempty}
              onChange={(event) => setOmitempty(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            <span>
              <code className="font-mono text-[12px]">,omitempty</code> on optional keys
            </span>
          </label>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <JsonTextArea
          id="go-input"
          label="JSON input"
          value={input}
          onChange={setInput}
          invalid={Boolean(error)}
          bodyClassName="h-[300px] lg:h-[460px]"
          placeholder={'Paste a JSON object or array.\n\n[{ "id": 1, "name": "Ada" }]'}
          meta={<span className="tabular-nums">{formatCount(input.length)} chars</span>}
        />

        <JsonTextArea
          id="go-output"
          label="Go structs"
          value={output}
          readOnly
          bodyClassName="h-[300px] lg:h-[460px]"
          placeholder="Generated struct declarations appear here."
          meta={
            result ? (
              <span className="tabular-nums">
                {formatCount(result.typeCount)} structs · {formatCount(result.lineCount)} lines
              </span>
            ) : (
              <span className="tabular-nums">0 lines</span>
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
                Download .go
              </button>
            </span>
          }
        />
      </div>

      <div aria-live="polite" className="space-y-3">
        {status ? (
          <Notice tone={status.tone} title={status.title}>
            <p>{status.detail}</p>
            {overLimit && checkoutUrl ? (
              <p className="mt-2">
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass("primary")}
                >
                  Upgrade to Pro
                </a>
              </p>
            ) : null}
          </Notice>
        ) : null}
        {error ? <JsonErrorPanel error={error} /> : null}
      </div>

      <p className="border-t border-slate-200 pt-3 text-xs text-slate-500">
        Free generation covers up to {formatCount(limit)} characters per document —{" "}
        <Link href="/json-to-go#pro" className="underline underline-offset-2">
          what Pro adds
        </Link>
        . The JSON you paste never leaves the tab; inference runs in your browser.
      </p>
    </div>
  );
}
