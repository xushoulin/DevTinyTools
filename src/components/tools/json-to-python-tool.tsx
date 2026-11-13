"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { JsonTextArea } from "@/components/ui/json-textarea";
import { JsonErrorPanel } from "@/components/ui/json-error-panel";
import { Notice } from "@/components/ui/notice";
import { buttonClass } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { downloadTextFile } from "@/lib/download";
import { PYTHON_EXAMPLE } from "@/lib/examples";
import { formatCount, parseJson, type JsonErrorInfo } from "@/lib/json-utils";
import { inferType, type InferredType } from "@/lib/type-infer";
import { emitPython, toSnakeCase, type PythonTarget } from "@/lib/python-emit";
import { useProUnlocked } from "@/lib/license";
import { PYTHON_FREE_CHAR_LIMIT, PYTHON_PRO_CHAR_LIMIT, getProCheckoutUrl } from "@/lib/pro";

interface Status {
  tone: "success" | "error" | "info";
  title: string;
  detail?: string;
}

const TARGETS: Array<{ value: PythonTarget; label: string; hint: string }> = [
  {
    value: "pydantic",
    label: "Pydantic v2",
    hint: "BaseModel with Field(alias=...) so snake_case fields still read the wire keys.",
  },
  {
    value: "dataclass",
    label: "dataclass",
    hint: "Zero dependencies. No aliases or validation, so the JSON keys go in comments.",
  },
];

export function JsonToPythonTool() {
  const [input, setInput] = useState("");
  const [inferred, setInferred] = useState<InferredType | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<JsonErrorInfo | null>(null);
  const [rootName, setRootName] = useState("Root");
  const [aliases, setAliases] = useState(true);
  const [target, setTarget] = useState<PythonTarget>("pydantic");

  const checkoutUrl = getProCheckoutUrl();
  const proActive = useProUnlocked();
  const proAvailable = !checkoutUrl || proActive;

  const limit = proAvailable ? PYTHON_PRO_CHAR_LIMIT : PYTHON_FREE_CHAR_LIMIT;
  const overLimit = input.length > limit;

  const result = useMemo(() => {
    if (!inferred) return null;
    return emitPython(inferred, { target, rootName, aliases });
  }, [inferred, target, rootName, aliases]);

  const output = result?.code ?? "";

  function handleGenerate() {
    setError(null);

    if (!input.trim()) {
      setStatus({
        tone: "error",
        title: "The input is empty",
        detail: "Paste a JSON object or array, or load the example to see the models.",
      });
      setInferred(null);
      return;
    }

    if (overLimit) {
      setInferred(null);
      setStatus({
        tone: "info",
        title: `This document is ${formatCount(input.length)} characters`,
        detail: `Free generation covers up to ${formatCount(PYTHON_FREE_CHAR_LIMIT)}. DevTinyTools Pro raises the cap to ${formatCount(PYTHON_PRO_CHAR_LIMIT)}.`,
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
      title: "Models generated",
      detail: Array.isArray(parsed.value)
        ? `${formatCount(records)} array ${records === 1 ? "element" : "elements"} sampled and merged. Keys missing from some elements become Optional[...] = None; a key that was always present but null stays Optional without a default.`
        : "One object sampled. Nested objects became separate models, declared before the classes that reference them.",
    });
  }

  async function handleCopy() {
    if (!output) {
      setStatus({ tone: "error", title: "Nothing to copy", detail: "Generate the models first." });
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
      setStatus({ tone: "error", title: "Nothing to download", detail: "Generate the models first." });
      return;
    }

    const base = toSnakeCase(rootName) || "models";
    const download = downloadTextFile(output, `${base}.py`);
    setStatus(
      download.ok
        ? { tone: "success", title: "Download started", detail: `Saved as ${download.filename}.` }
        : {
            tone: "error",
            title: "Download failed",
            detail: "Your browser blocked the download. Copy the models into a .py file instead.",
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
    setInput(PYTHON_EXAMPLE);
    setInferred(null);
    setError(null);
    setRootName("Order");
    setStatus({
      tone: "info",
      title: "Example loaded",
      detail:
        "Two orders with keys Python cannot use as-is: class and from become class_ and from_, orderId becomes order_id with an alias, and the second item has no unitPrice so that field is Optional[float].",
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

  const activeTarget = TARGETS.find((entry) => entry.value === target)!;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Output style" className="flex rounded-md border border-slate-300 p-0.5">
            {TARGETS.map((entry) => (
              <TargetTab
                key={entry.value}
                active={target === entry.value}
                onClick={() => setTarget(entry.value)}
              >
                {entry.label}
              </TargetTab>
            ))}
          </div>
          <button type="button" onClick={handleGenerate} className={buttonClass("primary")}>
            Generate models
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
            <span className="text-slate-500">Root class</span>
            <input
              type="text"
              value={rootName}
              onChange={(event) => setRootName(event.target.value)}
              spellCheck={false}
              className="w-28 rounded border border-slate-300 bg-white px-2 py-1 font-mono text-[12px] text-slate-800"
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={aliases}
              onChange={(event) => setAliases(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            <span>
              {target === "pydantic" ? (
                <>
                  <code className="font-mono text-[12px]">Field(alias=...)</code> for the wire
                  names
                </>
              ) : (
                <>Note the original keys in comments</>
              )}
            </span>
          </label>

          <span className="text-[12px] text-slate-500">{activeTarget.hint}</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <JsonTextArea
          id="python-input"
          label="JSON input"
          value={input}
          onChange={setInput}
          invalid={Boolean(error)}
          bodyClassName="h-[300px] lg:h-[460px]"
          placeholder={'Paste a JSON object or array.\n\n[{ "orderId": 1, "class": "premium" }]'}
          meta={<span className="tabular-nums">{formatCount(input.length)} chars</span>}
        />

        <JsonTextArea
          id="python-output"
          label={target === "pydantic" ? "Pydantic models" : "Dataclasses"}
          value={output}
          readOnly
          bodyClassName="h-[300px] lg:h-[460px]"
          placeholder="Generated Python models appear here."
          meta={
            result ? (
              <span className="tabular-nums">
                {formatCount(result.classCount)} classes · {formatCount(result.lineCount)} lines
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
                Download .py
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
        Models target Python 3.9 or newer — that is the first release where{" "}
        <code className="font-mono">list[...]</code> works in an annotation. Free generation covers
        up to {formatCount(limit)} characters per document —{" "}
        <Link href="/json-to-python#pro" className="underline underline-offset-2">
          what Pro adds
        </Link>
        . The JSON you paste never leaves the tab; inference runs in your browser.
      </p>
    </div>
  );
}

function TargetTab({
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
