import Link from "next/link";
import { TOOLS } from "@/lib/tools";

/** Cross-links that keep the internal link graph tight and useful. */
export function RelatedTools({ current }: { current: string }) {
  const related = TOOLS.filter((tool) => tool.href !== current);
  if (related.length === 0) return null;

  return (
    <section aria-labelledby="related-tools-heading">
      <h2
        id="related-tools-heading"
        className="text-xl font-semibold tracking-tight text-slate-900"
      >
        Related tools
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {related.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900">{tool.heading}</span>
              <span
                aria-hidden="true"
                className="text-slate-400 transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </span>
            <span className="mt-1.5 block text-[13px] leading-relaxed text-slate-600">
              {tool.summary}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
