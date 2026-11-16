"use client";

import { useMemo, useState, type ReactNode } from "react";

import { buttonClass } from "@/components/ui/button";
import { JsonTextArea } from "@/components/ui/json-textarea";
import { Notice } from "@/components/ui/notice";
import { copyText } from "@/lib/clipboard";
import { downloadTextFile, timestampedFilename } from "@/lib/download";
import { JSON_TO_YAML_EXAMPLE, YAML_TO_JSON_EXAMPLE } from "@/lib/examples";
import { formatBytes, formatCount, utf8ByteLength } from "@/lib/json-utils";
import {
  DEFAULT_CONVERT_OPTIONS,
  jsonToYaml,
  yamlToJson,
  type ConvertOptions,
} from "@/lib/yaml-convert";

type Direction = "to-yaml" | "to-json";

interface Status {
  tone: "success" | "error" | "info";
  title: string;
  detail?: string;
}

export function JsonToYamlTool() {
  const [direction, setDirection] = useState<Direction>("to-yaml");
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<ConvertOptions>(DEFAULT_CONVERT_OPTIONS);
  const [status, setStatus] = useState<Status | null>(null);

  const toYaml = useMemo(() => jsonToYaml(input, options), [input, options]);
  const toJson = useMemo(() => yamlToJson(input, options), [input, options]);

  const active = direction === "to-yaml" ? toYaml : toJson;
  const output = input.length === 0 ? "" : active.ok ? active.value : "";

  const inputBytes = input.length > 0 ? utf8ByteLength(input) : null;
  const outputBytes = output.length > 0 ? utf8ByteLength(output) : null;

  function switchDirection(next: Direction) {
    if (next === direction) return;
    setDirection(next);
    setStatus(null);
  }

  function handleSwap() {
    if (!output) {
      setStatus({
        tone: "error",
        title: "Nothing to swap",
        detail: "Convert something first — the result becomes the new input.",
      });
      return;
    }
    setInput(output);
    setDirection(direction === "to-yaml" ? "to-json" : "to-yaml");
    setStatus({
      tone: "info",
      title: "Output moved to the input",
      detail: "Now converting it back is a one-click round-trip check.",
    });
  }

  function handleClear() {
    setInput("");
    setStatus({ tone: "info", title: "Cleared", detail: "Both panels are empty." });
  }

  function handleExample() {
    setInput(direction === "to-yaml" ? JSON_TO_YAML_EXAMPLE : YAML_TO_JSON_EXAMPLE);
    setStatus({
      tone: "info",
      title: "Example loaded",
      detail:
        direction === "to-yaml"
          ? "A deployment-style config with a quoted port, a null and a boolean."
          : "The same config in YAML form. Note that port: \"8080\" stays a string in the JSON.",
    });
  }

  async function handleCopy() {
    if (!output) {
      setStatus({
        tone: "error",
        title: "Nothing to copy",
        detail: active.ok ? "Paste something first." : "Fix the error on the left first.",
      });
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
      setStatus({
        tone: "error",
        title: "Nothing to download",
        detail: active.ok ? "Paste something first." : "Fix the error on the left first.",
      });
      return;
    }
    const result = downloadTextFile(output, timestampedFilename("converted"));
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
            <DirectionTab
              active={direction === "to-yaml"}
              onClick={() => switchDirection("to-yaml")}
            >
              JSON → YAML
            </DirectionTab>
            <DirectionTab
              active={direction === "to-json"}
              onClick={() => switchDirection("to-json")}
            >
              YAML → JSON
            </DirectionTab>
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

        <fieldset className="mt-3 border-t border-slate-200 pt-3">
          <legend className="sr-only">Output options</legend>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-700">Indent</span>
              <div className="flex rounded-md border border-slate-300 p-0.5">
                <DirectionTab
                  active={options.indent === 2}
                  onClick={() => setOptions({ ...options, indent: 2 })}
                >
                  2
                </DirectionTab>
                <DirectionTab
                  active={options.indent === 4}
                  onClick={() => setOptions({ ...options, indent: 4 })}
                >
                  4
                </DirectionTab>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Applies to the YAML mapping levels, or to the pretty-printed JSON.
            </p>
          </div>
        </fieldset>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <JsonTextArea
          id="yaml-convert-input"
          label={direction === "to-yaml" ? "JSON" : "YAML"}
          value={input}
          onChange={setInput}
          bodyClassName="h-[280px] lg:h-[380px]"
          placeholder={
            direction === "to-yaml"
              ? 'Paste JSON.\n\n{\n  "service": "checkout",\n  "replicas": 3\n}'
              : "Paste YAML.\n\nservice: checkout\nreplicas: 3\npaths:\n  - /healthz"
          }
          meta={<span className="tabular-nums">{formatCount(input.length)} chars</span>}
        />

        <JsonTextArea
          id="yaml-convert-output"
          label={direction === "to-yaml" ? "YAML" : "JSON"}
          value={output}
          readOnly
          bodyClassName="h-[280px] lg:h-[380px]"
          placeholder={
            direction === "to-yaml"
              ? "The YAML appears here as you type."
              : "The JSON appears here as you type."
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

      {inputBytes !== null && outputBytes !== null ? (
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-4">
          <StatCell
            label="Input"
            value={formatCount(input.length)}
            hint={`${formatBytes(inputBytes)} in UTF-8`}
          />
          <StatCell
            label="Output"
            value={formatCount(output.length)}
            hint={`${formatBytes(outputBytes)} in UTF-8`}
          />
          <StatCell
            label="Size change"
            value={`${output.length >= input.length ? "+" : ""}${formatCount(
              output.length - input.length,
            )}`}
            hint="characters — YAML usually wins on nested maps"
          />
          <StatCell
            label="Direction"
            value={direction === "to-yaml" ? "JSON → YAML" : "YAML → JSON"}
            hint={direction === "to-yaml" ? "read by JSON.parse" : "parsed as YAML 1.2"}
          />
        </dl>
      ) : null}

      <div aria-live="polite" className="space-y-3">
        {status ? (
          <Notice tone={status.tone} title={status.title}>
            {status.detail ? <p>{status.detail}</p> : null}
          </Notice>
        ) : null}

        {input.length > 0 && !active.ok ? (
          <Notice tone="error" title={direction === "to-yaml" ? "Not valid JSON" : "Not valid YAML"}>
            <p>
              <code className="font-mono text-[12px] text-slate-800">{active.error}</code>
            </p>
            {active.line ? (
              <p className="mt-2">
                The parser pointed at line {active.line}. Indentation errors, a missing
                colon and tabs instead of spaces are the three most common causes.
              </p>
            ) : null}
          </Notice>
        ) : null}

        {direction === "to-json" && input.length > 0 && active.ok ? (
          <p className="text-xs text-slate-500">
            Parsed as YAML 1.2. Values that YAML 1.1 readers treat as booleans —
            <code className="font-mono"> yes </code>, <code className="font-mono">no </code>,
            <code className="font-mono"> on </code>, <code className="font-mono">off</code> — stay
            strings here, which is what the current spec says.
          </p>
        ) : null}
      </div>

      <p className="border-t border-slate-200 pt-3 text-xs text-slate-500">
        Both directions run here in the tab. YAML comments are not carried over — JSON has no
        place to put them — and YAML anchors or multi-document files are read, not written.
      </p>
    </div>
  );
}

function DirectionTab({
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

function StatCell({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-mono text-base text-slate-900">{value}</dd>
      <dd className="text-[11px] text-slate-400">{hint}</dd>
    </div>
  );
}
