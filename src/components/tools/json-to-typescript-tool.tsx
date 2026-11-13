"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { JsonTextArea } from "@/components/ui/json-textarea";
import { JsonErrorPanel } from "@/components/ui/json-error-panel";
import { Notice } from "@/components/ui/notice";
import { buttonClass } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { downloadTextFile } from "@/lib/download";
import { TYPES_EXAMPLE } from "@/lib/examples";
import { formatCount, parseJson, type JsonErrorInfo } from "@/lib/json-utils";
import { inferType, type InferredType } from "@/lib/type-infer";
import { emitTypeScript, emitZod } from "@/lib/type-emit";
import { emitJsonSchema } from "@/lib/schema-emit";
import { useProUnlocked } from "@/lib/license";
import {
  TYPE_FREE_CHAR_LIMIT,
  TYPE_PRO_CHAR_LIMIT,
  getProCheckoutUrl,
} from "@/lib/pro";

interface Status {
  tone: "success" | "error" | "info";
  title: string;
  detail?: string;
}

const TARGETS = ["typescript", "zod", "json-schema"] as const;

type Target = (typeof TARGETS)[number];

const TARGET_LABELS: Record<Target, string> = {
  typescript: "TypeScript interfaces",
  zod: "Zod schema",
  "json-schema": "JSON Schema",
};

const TARGET_SUFFIX: Record<Target, string> = {
  typescript: ".ts",
  zod: ".schema.ts",
  "json-schema": ".schema.json",
};

export function JsonToTypeScriptTool() {
  const [input, setInput] = useState("");
  const [inferred, setInferred] = useState<InferredType | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<JsonErrorInfo | null>(null);
  const [target, setTarget] = useState<Target>("typescript");
  const [rootName, setRootName] = useState("Root");
  const [indent, setIndent] = useState<2 | 4>(2);

  const checkoutUrl = getProCheckoutUrl();
  // Hydration-safe: the server snapshot is unlicensed, the client reads
  // localStorage after mount.
  const proActive = useProUnlocked();
  // No checkout configured = no paid tier yet, so nothing is gated.
  const proAvailable = !checkoutUrl || proActive;

  const limit = proAvailable ? TYPE_PRO_CHAR_LIMIT : TYPE_FREE_CHAR_LIMIT;
  const overLimit = input.length > limit;
  const lockedTarget = target !== "typescript" && !proAvailable;

  const result = useMemo(() => {
    if (!inferred || lockedTarget) return null;
    if (target === "json-schema") {
      return emitJsonSchema(inferred, { rootName, indent });
    }
    const options = { rootName, indent };
    return target === "zod" ? emitZod(inferred, options) : emitTypeScript(inferred, options);
  }, [inferred, target, rootName, indent, lockedTarget]);

  const output = result?.code ?? "";

  function handleGenerate() {
    setError(null);

    if (!input.trim()) {
      setStatus({
        tone: "error",
        title: "The input is empty",
        detail: "Paste a JSON object or array, or load the example to see the output shape.",
      });
      setInferred(null);
      return;
    }

    if (overLimit) {
      setInferred(null);
      setStatus({
        tone: "info",
        title: `This document is ${formatCount(input.length)} characters`,
        detail: `Free generation covers up to ${formatCount(TYPE_FREE_CHAR_LIMIT)}. DevTinyTools Pro raises the cap to ${formatCount(TYPE_PRO_CHAR_LIMIT)}.`,
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

    const inferredRoot = inferType(parsed.value);
    setInferred(inferredRoot);

    const isArray = Array.isArray(parsed.value);
    // Narrowing does not travel through the `isArray` boolean, so the length is
    // read from a directly narrowed expression.
    const records = Array.isArray(parsed.value) ? parsed.value.length : 1;
    setStatus({
      tone: "success",
      title: "Types generated",
      detail: isArray
        ? `${formatCount(records)} array ${records === 1 ? "element" : "elements"} sampled and merged. Keys that only some elements carry are marked optional.`
        : "One object sampled. Nested objects were hoisted into their own named declarations.",
    });
  }

  async function handleCopy() {
    if (!output) {
      setStatus({ tone: "error", title: "Nothing to copy", detail: "Generate types first." });
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
      setStatus({ tone: "error", title: "Nothing to download", detail: "Generate types first." });
      return;
    }

    const base = rootName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "types";
    const download = downloadTextFile(output, `${base}${TARGET_SUFFIX[target]}`);
    setStatus(
      download.ok
        ? { tone: "success", title: "Download started", detail: `Saved as ${download.filename}.` }
        : {
            tone: "error",
            title: "Download failed",
            detail:
              "Your browser blocked the download. Copy the output into a file of the right extension instead.",
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
    setInput(TYPES_EXAMPLE);
    setInferred(null);
    setError(null);
    setStatus({
      tone: "info",
      title: "Example loaded",
      detail:
        "Two user records that disagree: the second has no avatarUrl and a null lastSeenAt. Generate to see both handled.",
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

  function handleTargetChange(next: Target) {
    setTarget(next);
    setStatus(
      next !== "typescript" && !proAvailable
        ? {
            tone: "info",
            title: "Schema output is a Pro feature",
            detail:
              "TypeScript interfaces stay free. Pro adds Zod and JSON Schema output, a 10 MB limit and lifetime updates.",
          }
        : null,
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleGenerate} className={buttonClass("primary")}>
            Generate types
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
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Output</span>
            <div className="flex overflow-hidden rounded border border-slate-300">
              {TARGETS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleTargetChange(option)}
                  aria-pressed={target === option}
                  className={
                    target === option
                      ? "bg-slate-800 px-2.5 py-1 text-[12px] text-white"
                      : "bg-white px-2.5 py-1 text-[12px] text-slate-700 hover:bg-slate-50"
                  }
                >
                  {TARGET_LABELS[option]}
                  {option !== "typescript" && !proAvailable ? (
                    <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      Pro
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2">
            <span className="text-slate-500">Root type</span>
            <input
              type="text"
              value={rootName}
              onChange={(event) => setRootName(event.target.value)}
              spellCheck={false}
              className="w-32 rounded border border-slate-300 bg-white px-2 py-1 font-mono text-[12px] text-slate-800"
            />
          </label>

          <label className="flex items-center gap-2">
            <span className="text-slate-500">Indent</span>
            <select
              value={indent}
              onChange={(event) => setIndent(Number(event.target.value) === 4 ? 4 : 2)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-[13px] text-slate-800"
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <JsonTextArea
          id="types-input"
          label="JSON input"
          value={input}
          onChange={setInput}
          invalid={Boolean(error)}
          bodyClassName="h-[300px] lg:h-[440px]"
          placeholder={'Paste a JSON object or array.\n\n[{ "id": 1, "name": "Ada" }]'}
          meta={<span className="tabular-nums">{formatCount(input.length)} chars</span>}
        />

        {lockedTarget ? (
          <div className="flex h-[300px] flex-col justify-center rounded-lg border border-amber-200 bg-amber-50 p-5 lg:h-[440px]">
            <p className="text-sm font-semibold text-amber-900">Schema output is part of Pro</p>
            <p className="mt-2 text-[13px] leading-relaxed text-amber-900/90">
              Generating TypeScript interfaces stays free. Pro adds the Zod and JSON Schema
              outputs, raises the document limit to {formatCount(TYPE_PRO_CHAR_LIMIT)} characters
              and keeps the tool working for a lifetime licence.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {checkoutUrl ? (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass("primary")}
                >
                  Upgrade to Pro
                </a>
              ) : null}
              <Link href="/json-to-typescript#pro" className="text-[13px] text-amber-900 underline underline-offset-2">
                What Pro includes
              </Link>
            </div>
            <p className="mt-3 text-[12px] text-amber-900/70">
              Already bought? Activate your licence key below to switch this output on.
            </p>
          </div>
        ) : (
          <JsonTextArea
            id="types-output"
            label={TARGET_LABELS[target]}
            value={output}
            readOnly
            bodyClassName="h-[300px] lg:h-[440px]"
            placeholder="Generated declarations appear here."
            meta={
              result ? (
                <span className="tabular-nums">
                  {formatCount(result.typeCount)} types · {formatCount(result.lineCount)} lines
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
                  Download
                </button>
              </span>
            }
          />
        )}
      </div>

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
        Free generation covers up to {formatCount(limit)} characters per document —{" "}
        <Link href="/json-to-typescript#pro" className="underline underline-offset-2">
          what Pro adds
        </Link>
        . The JSON you paste never leaves the tab; inference runs in your browser.
      </p>
    </div>
  );
}
