import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { GUIDES, formatGuideDate } from "@/lib/guides";
import { pageMetadata } from "@/lib/metadata";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

const PATH = "/guides";

export const metadata = pageMetadata({
  title: "JSON Guides",
  description:
    "Short, measured guides to JSON behaviour: parser error messages, number precision and whether minifying actually saves bandwidth.",
  path: PATH,
});

export default function GuidesIndexPage() {
  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Guides" }]} />

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          JSON guides
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          Each guide takes one thing JSON does that surprises people, shows the real
          output from the engine, and explains what to do about it. No framework
          installs, no twenty-minute read — the numbers come from measurements taken in
          this project, not from a vendor page.
        </p>

        <ul className="mt-8 space-y-4">
          {GUIDES.map((guide) => (
            <li key={guide.slug}>
              <article className="rounded-lg border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                  {guide.topic}
                </p>
                <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900">
                  <Link href={guide.href} className="hover:underline">
                    {guide.title}
                  </Link>
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                  {guide.summary}
                </p>
                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <time dateTime={guide.publishedAt}>
                    {formatGuideDate(guide.publishedAt)}
                  </time>
                  <span aria-hidden="true">·</span>
                  <span>{guide.readingMinutes} min read</span>
                  <span aria-hidden="true">·</span>
                  <Link
                    href={guide.relatedTool.href}
                    className="text-blue-700 underline underline-offset-2"
                  >
                    {guide.relatedTool.name}
                  </Link>
                </p>
              </article>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-sm leading-relaxed text-slate-600">
          Looking for the tools instead? Start with the{" "}
          <Link href="/json-formatter" className="text-blue-700 underline underline-offset-2">
            JSON Formatter
          </Link>
          , the{" "}
          <Link href="/json-validator" className="text-blue-700 underline underline-offset-2">
            JSON Validator
          </Link>{" "}
          or the{" "}
          <Link href="/json-minifier" className="text-blue-700 underline underline-offset-2">
            JSON Minifier
          </Link>
          .
        </p>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${SITE_NAME} JSON guides`,
          url: absoluteUrl(PATH),
          inLanguage: "en",
          description:
            "Short, measured guides to JSON parser errors, number precision and minification.",
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: GUIDES.length,
            itemListElement: GUIDES.map((guide, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: guide.title,
              url: absoluteUrl(guide.href),
            })),
          },
        }}
      />
    </>
  );
}
