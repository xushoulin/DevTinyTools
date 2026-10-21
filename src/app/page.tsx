import Link from "next/link";
import { AdSlot } from "@/components/ad-slot";
import { JsonLd } from "@/components/json-ld";
import { ToolCard } from "@/components/tool-card";
import { buttonClass } from "@/components/ui/button";
import { pageMetadata } from "@/lib/metadata";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { PLANNED_TOOLS, TOOLS } from "@/lib/tools";

export const metadata = pageMetadata({
  title: `${SITE_NAME} — Free Online Developer Tools`,
  description:
    "Free browser-based developer tools. Format, validate and minify JSON with no uploads and no sign-up.",
  path: "/",
});

const PRINCIPLES = [
  {
    title: "Local by default",
    body: "Every tool runs inside the page using browser APIs. Your input is never sent to a server, stored in a database, or written to a URL.",
  },
  {
    title: "One job per page",
    body: "Each tool does a single, well-defined task with the options that task actually needs — no dashboards, no feature bloat.",
  },
  {
    title: "Nothing to install",
    body: "No account, no extension, no command line. Open the page, paste your data, get a result.",
  },
];

const FORMATTER_FEATURES = [
  "Pretty-print with 2 or 4 space indentation",
  "Minify and validate from the same editor",
  "Parser errors reported with line and column",
  "Copy or download the result as a .json file",
  "Keyboard shortcut: ⌘/Ctrl + Enter",
];

export default function HomePage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                Free online developer tools
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                Developer tools that run entirely in your browser
              </h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600">
                {SITE_NAME} is a small set of single-purpose utilities for everyday
                development work. Formatting and validation happen locally, so the JSON
                you paste never leaves your device.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href="/json-formatter" className={buttonClass("primary")}>
                  Open JSON Formatter
                </Link>
                <Link href="/json-validator" className={buttonClass("secondary")}>
                  Validate JSON
                </Link>
              </div>

              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                <li>No uploads</li>
                <li>No sign-up</li>
                <li>Your JSON stays in this tab</li>
                <li>Works offline once loaded</li>
              </ul>
            </div>

            <div className="hidden lg:block" aria-hidden="true">
              <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-sm">
                <div className="border-b border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                  Before
                </div>
                <pre className="code-field px-3 py-2.5 text-slate-300">
                  <code>{'{"id":42,"tags":["a","b"]}'}</code>
                </pre>
                <div className="border-y border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                  After
                </div>
                <pre className="code-field px-3 py-2.5 text-slate-100">
                  <code>{`{
  "id": 42,
  "tags": [
    "a",
    "b"
  ]
}`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <section id="tools" aria-labelledby="tools-heading" className="scroll-mt-20">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2
                id="tools-heading"
                className="text-xl font-semibold tracking-tight text-slate-900"
              >
                Tools
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
                Three JSON tools covering the tasks that come up most often: reading a
                minified payload, checking why a document is rejected, and shrinking it
                again before shipping.
              </p>
            </div>
            <span className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-500">
              JSON · {TOOLS.length} tools
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((tool) => (
              <ToolCard key={tool.href} tool={tool} />
            ))}
          </div>
        </section>

        <section aria-labelledby="formatter-heading" className="mt-12">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="grid gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:p-8">
              <div>
                <h2
                  id="formatter-heading"
                  className="text-lg font-semibold tracking-tight text-slate-900"
                >
                  Start with the JSON Formatter
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Paste a minified API response and get a readable document, or go the
                  other way and compress it before you store it. The same editor also
                  validates what you paste, so a broken document is caught immediately.
                </p>
                <Link
                  href="/json-formatter"
                  className={`${buttonClass("primary")} mt-5`}
                >
                  Format JSON now
                </Link>
              </div>

              <ul className="space-y-2.5 text-sm text-slate-700">
                {FORMATTER_FEATURES.map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 8.5l3.2 3L13 4.5" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="principles-heading" className="mt-12">
          <h2
            id="principles-heading"
            className="text-xl font-semibold tracking-tight text-slate-900"
          >
            How these tools are built
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {PRINCIPLES.map((principle) => (
              <div
                key={principle.title}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <h3 className="text-sm font-semibold text-slate-900">{principle.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
                  {principle.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="planned-heading" className="mt-12">
          <h2
            id="planned-heading"
            className="text-xl font-semibold tracking-tight text-slate-900"
          >
            Planned
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            These tools are not built yet. They are listed here so it is clear what this
            site is working towards — there are no placeholder pages behind them.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {PLANNED_TOOLS.map((tool) => (
              <li
                key={tool.name}
                className="rounded-lg border border-dashed border-slate-300 bg-white/60 p-4"
              >
                <h3 className="text-sm font-semibold text-slate-800">{tool.name}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                  {tool.summary}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="about-heading" className="mt-12">
          <h2
            id="about-heading"
            className="text-xl font-semibold tracking-tight text-slate-900"
          >
            About {SITE_NAME}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            {SITE_NAME} is an independent project. The goal is simple: keep a handful of
            commonly needed developer utilities online, fast, and free of the friction
            that usually comes with them. Read more{" "}
            <Link href="/about" className="text-blue-700 underline underline-offset-2">
              about the site and its principles
            </Link>
            , or check the{" "}
            <Link href="/privacy-policy" className="text-blue-700 underline underline-offset-2">
              privacy policy
            </Link>{" "}
            for exactly what the tools do with your data.
          </p>
        </section>

        <AdSlot slot="beforeFooter" />
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
          description:
            "Free browser-based developer tools for formatting, validating and minifying JSON.",
          inLanguage: "en",
        }}
      />
    </>
  );
}
