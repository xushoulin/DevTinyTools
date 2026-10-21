import type { JsonErrorInfo } from "@/lib/json-utils";

/**
 * Shows a parser error with a best-effort location.
 *
 * The wording deliberately avoids claiming precision: browsers phrase JSON
 * errors differently and the line/column pair is either reported by the engine
 * or derived from its character offset.
 */
export function JsonErrorPanel({ error }: { error: JsonErrorInfo }) {
  const hasLocation = error.line !== null;

  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3.5">
      <div className="flex items-start gap-2">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white"
        >
          !
        </span>
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium text-red-900">
            {error.kind === "empty"
              ? "Nothing to check"
              : error.kind === "too-large"
                ? "Input too large"
                : "Invalid JSON"}
          </p>

          <p className="text-[13px] leading-relaxed text-red-800">{error.message}</p>

          {hasLocation ? (
            <p className="font-mono text-xs text-red-900">
              Line {error.line}
              {error.column !== null ? `, column ${error.column}` : ""}
              {error.reportedByParser ? "" : " (approximate)"}
            </p>
          ) : null}

          {error.sourceLine ? (
            <div className="overflow-x-auto rounded border border-red-200 bg-white/70">
              <pre className="code-field px-2.5 py-2 text-[12px] text-slate-800">
                <code>{error.sourceLine}</code>
              </pre>
            </div>
          ) : null}

          {error.hints.length > 0 ? (
            <div className="text-[13px] leading-relaxed text-red-900">
              <p className="font-medium">Possible causes</p>
              <ul className="mt-1 ml-1 space-y-1">
                {error.hints.map((hint) => (
                  <li key={hint} className="flex gap-2">
                    <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-red-400" />
                    <span className="min-w-0">{hint}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="text-[11px] leading-relaxed text-red-700/80">
            Positions come from your browser&apos;s JSON parser. Different browsers word
            these errors differently, so use the location as a pointer to the area
            that needs attention rather than an exact diagnosis.
          </p>
        </div>
      </div>
    </div>
  );
}
