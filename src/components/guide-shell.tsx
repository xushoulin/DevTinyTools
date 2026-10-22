import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { buttonClass } from "@/components/ui/button";
import { formatGuideDate, otherGuides, type GuideDefinition } from "@/lib/guides";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

interface GuideShellProps {
  guide: GuideDefinition;
  children: ReactNode;
}

/**
 * Shared frame for every guide: breadcrumbs, title block, the article body, a
 * link back to the matching tool and the other guides.
 *
 * The Article structured data lives here rather than in each page, so a guide
 * cannot ship without it.
 */
export function GuideShell({ guide, children }: GuideShellProps) {
  const more = otherGuides(guide.slug);
  const modified = guide.updatedAt ?? guide.publishedAt;

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Guides", href: "/guides" },
            { label: guide.shortTitle },
          ]}
        />

        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-blue-700">
          {guide.topic}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {guide.title}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{guide.lede}</p>

        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <time dateTime={guide.publishedAt}>{formatGuideDate(guide.publishedAt)}</time>
          <span aria-hidden="true">·</span>
          <span>{guide.readingMinutes} min read</span>
          <span aria-hidden="true">·</span>
          <span>
            Tool:{" "}
            <Link
              href={guide.relatedTool.href}
              className="text-blue-700 underline underline-offset-2"
            >
              {guide.relatedTool.name}
            </Link>
          </span>
        </p>

        <article className="mt-9 space-y-9 text-sm leading-relaxed text-slate-600">
          {children}
        </article>

        <aside className="mt-10 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Try it on your own data</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
            {guide.relatedTool.name} runs entirely in this tab. Nothing you paste is
            uploaded, stored or logged.
          </p>
          <Link href={guide.relatedTool.href} className={`${buttonClass("primary")} mt-4`}>
            Open {guide.relatedTool.name}
          </Link>
        </aside>

        <nav aria-label="More guides" className="mt-10 border-t border-slate-200 pt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            More guides
          </h2>
          <ul className="mt-3 space-y-3">
            {more.map((item) => (
              <li key={item.slug}>
                <Link
                  href={item.href}
                  className="group block rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
                >
                  <span className="text-sm font-medium text-slate-900 group-hover:underline">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-slate-600">
                    {item.summary}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs">
            <Link
              href="/guides"
              className="text-slate-600 underline underline-offset-2 hover:text-slate-900"
            >
              All guides
            </Link>
          </p>
        </nav>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: guide.title,
          description: guide.description,
          datePublished: guide.publishedAt,
          dateModified: modified,
          inLanguage: "en",
          about: guide.topic,
          url: absoluteUrl(guide.href),
          mainEntityOfPage: absoluteUrl(guide.href),
          author: { "@type": "Organization", name: SITE_NAME },
          publisher: { "@type": "Organization", name: SITE_NAME },
          isPartOf: {
            "@type": "CollectionPage",
            name: `${SITE_NAME} guides`,
            url: absoluteUrl("/guides"),
          },
        }}
      />
    </>
  );
}
