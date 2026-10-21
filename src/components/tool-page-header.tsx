import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";

interface ToolPageHeaderProps {
  crumbs: Crumb[];
  title: string;
  description: string;
}

export function ToolPageHeader({ crumbs, title, description }: ToolPageHeaderProps) {
  return (
    <div className="border-b border-slate-200 pb-6">
      <Breadcrumbs items={crumbs} />

      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        {title}
      </h1>

      <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-600">
        {description}
      </p>

      <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5 text-emerald-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="7" width="10" height="7" rx="1.5" />
          <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
        </svg>
        Runs entirely in your browser — your JSON is never uploaded.
      </p>
    </div>
  );
}
