import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { PRO_PRICE_LIFETIME } from "@/lib/pro";
import { pageMetadata } from "@/lib/metadata";
import { SITE_NAME, absoluteUrl } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

const PATH = "/tools";

export const metadata = pageMetadata({
  title: "JSON tools that run in your browser",
  description:
    "Twelve JSON tools that run in your browser: format, validate, minify, diff, convert to and from CSV, and generate TypeScript, Go, Java, C# or Python models.",
  path: PATH,
});

/**
 * Groups are declared here rather than in `tools.ts` because they only exist to
 * organise this page — the navigation and the homepage grid stay flat, and a
 * tool must never disappear from the site because someone forgot to file it.
 */
const GROUPS: Array<{ id: string; title: string; blurb: string; hrefs: string[] }> = [
  {
    id: "inspect",
    title: "Read, check and shrink",
    blurb:
      "What you reach for when a payload arrives unreadable, rejected, or too large to ship.",
    hrefs: ["/json-formatter", "/json-validator", "/json-minifier", "/json-escape"],
  },
  {
    id: "compare",
    title: "Compare and convert",
    blurb:
      "What changed between two versions, and moving data between JSON and a spreadsheet without retyping it.",
    hrefs: ["/json-diff", "/json-to-csv", "/csv-to-json"],
  },
  {
    id: "generate",
    title: "Generate code from a sample",
    blurb:
      "Paste a response, get the model. Every generator samples all array elements, so a key that only some records carry becomes optional instead of required.",
    hrefs: [
      "/json-to-typescript",
      "/json-to-go",
      "/json-to-java",
      "/json-to-csharp",
      "/json-to-python",
    ],
  },
];

/** The question a visitor actually arrives with, mapped to the page that answers it. */
const DECISIONS: Array<{ want: string; href: string; label: string }> = [
  { want: "Make a minified response readable", href: "/json-formatter", label: "Formatter" },
  { want: "Find out why a document is rejected", href: "/json-validator", label: "Validator" },
  { want: "Shrink a payload before shipping it", href: "/json-minifier", label: "Minifier" },
  {
    want: "Turn JSON into a string literal for a code file",
    href: "/json-escape",
    label: "Escape / Unescape",
  },
  { want: "See exactly what changed between two versions", href: "/json-diff", label: "Diff" },
  { want: "Open a JSON array in Excel or Sheets", href: "/json-to-csv", label: "JSON to CSV" },
  { want: "Turn a CSV export back into JSON", href: "/csv-to-json", label: "CSV to JSON" },
  {
    want: "Get TypeScript interfaces, Zod or JSON Schema",
    href: "/json-to-typescript",
    label: "JSON to TypeScript",
  },
  { want: "Get a Go struct with the right tags", href: "/json-to-go", label: "JSON to Go" },
  { want: "Get Java POJOs that handle null keys", href: "/json-to-java", label: "JSON to Java" },
  {
    want: "Get C# classes that compile without warnings",
    href: "/json-to-csharp",
    label: "JSON to C#",
  },
  {
    want: "Get Pydantic models or dataclasses",
    href: "/json-to-python",
    label: "JSON to Python",
  },
];

const FAQ = [
  {
    question: "Is my data uploaded anywhere?",
    answer:
      "No. Formatting, validation, diffing and every code generator run in this browser tab. There is no upload endpoint and no server-side processing: the file picker reads the file locally with the FileReader API, and you can confirm the absence of requests in the network panel. That is also why the tools keep working with a flaky connection once the page has loaded.",
  },
  {
    question: "How large a document can I paste?",
    answer:
      "One million characters per document for free, which is roughly 1 MB of JSON — more than most API responses and comfortable for a single configuration file. Pro raises the cap to ten million characters, around 10 MB, which is the size where a browser tab starts to feel the work regardless of the limit.",
  },
  {
    question: "Do I need an account?",
    answer:
      "No, and there is nothing to sign up to. Free use is anonymous and unlimited. Pro is a licence key rather than an account, sold through Lemon Squeezy as merchant of record, and the key is validated in this browser — no email, password or profile.",
  },
  {
    question: "What does Pro actually add?",
    answer:
      `Two things: the ten-times larger document cap, and batch conversion with ZIP export on the TypeScript tool, which turns a folder of .json files into a matching set of source files in one pass. Pro is ${PRO_PRICE_LIFETIME} one-time for a lifetime licence and unlocks every tool on the site, so it is not a per-tool subscription.`,
  },
  {
    question: "Are the generators a replacement for designing the model yourself?",
    answer:
      "They are a starting point, and the guides say so explicitly. A generated model describes the samples it saw: a field that is always present in three responses may still be absent in the fourth. The generators handle the mechanical work — naming, nullability, aliases, tags — and leave four decisions to you: which fields are required, which numbers are money, which strings are dates, and which keys are enums.",
  },
  {
    question: "Which one should I start with?",
    answer:
      "If a document is broken, the validator; the error message names the byte where parsing stopped. If it is valid but unreadable, the formatter. If you are writing client code against an endpoint, the generator for your language, then read its guide before trusting the output.",
  },
];

export default function ToolsIndexPage() {
  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Tools" }]} />

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          JSON tools that run in your browser
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          All {TOOLS.length} tools share the same constraints: no upload, no account, no
          request while the work happens. Each one does a single job — nothing tries to be
          a platform. Pick by the question you arrived with, not by the tool name.
        </p>

        <section id="which" className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Which tool do I need?
          </h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full border-collapse text-left text-[13px]">
              <caption className="sr-only">
                Common tasks and the page that performs each one
              </caption>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    You want to…
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Use
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DECISIONS.map((row) => (
                  <tr key={row.href + row.want}>
                    <td className="px-3 py-2.5 text-slate-600">{row.want}</td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={row.href}
                        className="font-medium text-blue-700 underline underline-offset-2"
                      >
                        {row.label}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {GROUPS.map((group) => {
          const items = group.hrefs
            .map((href) => TOOLS.find((tool) => tool.href === href))
            .filter((tool): tool is (typeof TOOLS)[number] => tool !== undefined);

          return (
            <section key={group.id} className="mt-11">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                {group.title}
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
                {group.blurb}
              </p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {items.map((tool) => (
                  <li key={tool.href}>
                    <Link
                      href={tool.href}
                      className="block h-full rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
                    >
                      <span className="block text-[14px] font-semibold text-slate-900">
                        {tool.name}
                      </span>
                      <span className="mt-1 block text-[13px] leading-relaxed text-slate-600">
                        {tool.summary}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <section className="mt-11">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Why nothing is uploaded
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Every tool is a static page: the parsing, the inference and the code
            generation are JavaScript running in the tab you already have open. Nothing is
            sent to a server, so a payload containing customer records, tokens or internal
            hostnames never leaves the machine — which is the usual reason a tool like
            this is not allowed at work.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            It also sets an honest limit. There is no server to do the work, so a
            hundred-megabyte export will not open; the free cap is one million characters
            per document and Pro raises it to ten million. Both numbers are stated on
            every tool page rather than discovered after the paste.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            The trade-off has a second half: no account means no saved history. Pro is a
            licence key validated in the browser, not a login, so there is no workspace to
            sync across machines — the reason the price is one-time rather than monthly.
          </p>
        </section>

        <section className="mt-11">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Not sure the output is right?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            The{" "}
            <Link href="/guides" className="text-blue-700 underline underline-offset-2">
              guides
            </Link>{" "}
            explain where each generator stops being able to help: which fields a sample
            cannot mark as required, why{" "}
            <Link
              href="/guides/why-json-numbers-lose-precision"
              className="text-blue-700 underline underline-offset-2"
            >
              large integers change value
            </Link>
            , and what each language does with a key that is{" "}
            <Link
              href="/guides/convert-json-to-go-struct"
              className="text-blue-700 underline underline-offset-2"
            >
              absent rather than null
            </Link>
            . They are written against the output of these tools, with the real
            compiler messages included.
          </p>
        </section>

        <div className="mt-11">
          <FaqSection items={FAQ} path={PATH} />
        </div>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${SITE_NAME} tools`,
          url: absoluteUrl(PATH),
          inLanguage: "en",
          description:
            "Browser-based JSON tools: format, validate, minify, diff, convert to and from CSV, and generate TypeScript, Go, Java, C#, Python or JSON Schema from a sample.",
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: TOOLS.length,
            itemListElement: TOOLS.map((tool, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: tool.name,
              url: absoluteUrl(tool.href),
            })),
          },
        }}
      />
    </>
  );
}
