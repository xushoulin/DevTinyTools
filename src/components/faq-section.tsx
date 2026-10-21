import { JsonLd } from "@/components/json-ld";
import { absoluteUrl } from "@/lib/site";

export interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  items: FaqItem[];
  /** Page path used in the FAQPage structured data. */
  path: string;
  title?: string;
  intro?: string;
  id?: string;
}

export function FaqSection({
  items,
  path,
  title = "Frequently asked questions",
  intro,
  id = "faq",
}: FaqSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-20">
      <h2
        id={`${id}-heading`}
        className="text-xl font-semibold tracking-tight text-slate-900"
      >
        {title}
      </h2>
      {intro ? <p className="mt-2 text-sm text-slate-600">{intro}</p> : null}

      <div className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {items.map((item) => (
          <details key={item.question} className="group">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-3.5 text-sm font-medium text-slate-900 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span>
              <span
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-slate-400 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="px-4 pb-4 text-sm leading-relaxed text-slate-600">
              {item.answer}
            </div>
          </details>
        ))}
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
          url: absoluteUrl(path),
        }}
      />
    </section>
  );
}
