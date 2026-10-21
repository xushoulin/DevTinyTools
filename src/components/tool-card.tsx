import Link from "next/link";
import type { ToolDefinition } from "@/lib/tools";

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  return (
    <Link
      href={tool.href}
      className="group flex flex-col rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      <span className="inline-flex w-fit rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
        {tool.category}
      </span>
      <h3 className="mt-2.5 text-[15px] font-semibold text-slate-900">{tool.heading}</h3>
      <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-slate-600">
        {tool.summary}
      </p>
      <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-blue-700">
        Open tool
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </span>
    </Link>
  );
}
