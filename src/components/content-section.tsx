import type { ReactNode } from "react";

interface ContentSectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

/**
 * Standard article block for the explanatory copy under each tool. Keeping the
 * typography in one place makes the pages read consistently.
 */
export function ContentSection({ id, title, children }: ContentSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-20">
      <h2
        id={`${id}-heading`}
        className="text-xl font-semibold tracking-tight text-slate-900"
      >
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
        {children}
      </div>
    </section>
  );
}

export function ProseList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="ml-1 space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2.5">
          <span
            aria-hidden="true"
            className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300"
          />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px] text-slate-800">
      {children}
    </code>
  );
}

/**
 * Fenced block for snippets that must keep their line breaks. The content is
 * passed as a template string, so backslashes and quotes survive untouched.
 */
export function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-[12px] leading-relaxed text-slate-700">
      <code>{children}</code>
    </pre>
  );
}

export function StepList({ steps }: { steps: Array<{ title: string; body: string }> }) {
  return (
    <ol className="mt-1 space-y-3">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-3">
          <span
            aria-hidden="true"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600"
          >
            {index + 1}
          </span>
          <span className="min-w-0">
            <span className="font-medium text-slate-900">{step.title}</span>{" "}
            {step.body}
          </span>
        </li>
      ))}
    </ol>
  );
}
