import Link from "next/link";
import { AdSlot } from "@/components/ad-slot";
import { ContentSection, ProseList, StepList } from "@/components/content-section";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { RelatedTools } from "@/components/related-tools";
import { ToolPageHeader } from "@/components/tool-page-header";
import { JsonFormatterTool } from "@/components/tools/json-formatter-tool";
import { pageMetadata } from "@/lib/metadata";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

const PATH = "/json-formatter";

export const metadata = pageMetadata({
  title: "JSON Formatter & Validator",
  description:
    "Format and validate JSON online. Pretty-print with 2 or 4 spaces, catch syntax errors with line numbers, then copy or download the result. Runs in your browser.",
  path: PATH,
});

const FAQ = [
  {
    question: "Is my JSON uploaded to a server?",
    answer:
      "No. Formatting, minifying and validating all run inside this page using the browser's built-in JSON parser. The text you paste is never sent over the network, stored in a database, or written to the URL.",
  },
  {
    question: "Does formatting change my data?",
    answer:
      "Whitespace is the only thing formatting is meant to change, and keys, values and nesting are preserved. Four engine-level differences are worth knowing, all covered below: integers above 2^53 lose precision, keys that look like array indices are reordered ascending, duplicate keys collapse to the last value, and numbers are re-printed in their shortest form (1.0 becomes 1).",
  },
  {
    question: "Why did my 64-bit ID come back with a different last digit?",
    answer:
      "JSON has one number type, and JavaScript implements it as an IEEE-754 double, which holds 53 bits of integer precision exactly. A snowflake or database id such as 9007199254740993 is stored as 9007199254740992. Send such ids as strings, or format with a tool that keeps the number text instead of parsing it.",
  },
  {
    question: "Why does valid-looking JSON get rejected?",
    answer:
      "The most common causes are a trailing comma before a closing bracket, single quotes instead of double quotes, property names without quotes, and comments. Standard JSON allows none of these, even though JavaScript object literals do.",
  },
  {
    question: "Which indentation should I use?",
    answer:
      "Two spaces is the most common default in JavaScript projects and matches the Prettier and ESLint defaults. Four spaces is easier to scan in deeply nested documents. Whichever you pick, keep it consistent across the repository so diffs stay readable.",
  },
  {
    question: "How large can the input be?",
    answer:
      "The editor accepts up to 2,000,000 characters. Everything is processed in the tab, so the practical limit is your device's memory. For multi-hundred-megabyte files, use a command-line tool such as jq instead.",
  },
  {
    question: "Can I use this tool offline?",
    answer:
      "Yes. Once the page has loaded, the JSON processing has no network dependency, so it keeps working if your connection drops. Reloading the page still requires a connection the first time.",
  },
  {
    question: "Is there an API?",
    answer:
      "No. This is a browser tool only. There is no public endpoint, and deliberately so: adding one would mean your JSON leaves your machine.",
  },
];

const ROUND_TRIP = [
  {
    input: '{"id":9007199254740993}',
    output: '{"id": 9007199254740992}',
    why: "Numbers become IEEE-754 doubles. Integers above 2^53 lose their last digits.",
  },
  {
    input: '{"b":1,"2":2,"1":3}',
    output: '{"1": 3, "2": 2, "b": 1}',
    why: "Keys that look like array indices are enumerated first, ascending. That is a JavaScript object rule, not a JSON one.",
  },
  {
    input: '{"a":1,"a":2}',
    output: '{"a": 2}',
    why: "Duplicate member names collapse silently: the last value wins and the others are gone.",
  },
  {
    input: '{"x":1.0,"y":1e3,"z":-0}',
    output: '{"x": 1, "y": 1000, "z": 0}',
    why: "Numbers are re-printed in their shortest round-trippable form.",
  },
  {
    input: '"\\u00e9\\/"',
    output: '"é/"',
    why: "Escapes are decoded, then only the ones that must be escaped are written back.",
  },
];

const COMMON_ERRORS = [
  {
    error: "Unexpected token } / Expected double-quoted property name",
    cause: "Trailing comma after the last member",
    fix: "Delete the comma that comes directly before } or ].",
  },
  {
    error: "Unexpected token '",
    cause: "Single quotes used for a string or a key",
    fix: 'Replace every \' with " around strings and property names.',
  },
  {
    error: "Unexpected token n / Expected property name",
    cause: "Unquoted object key, e.g. {name: \"x\"}",
    fix: 'Wrap the key in double quotes: {"name": "x"}.',
  },
  {
    error: "Unexpected token /",
    cause: "A // or /* */ comment was left in the file",
    fix: "Remove comments, or switch to JSONC/JSON5 if your tooling supports it.",
  },
  {
    error: "Unexpected end of JSON input",
    cause: "A closing brace, bracket or quote is missing",
    fix: "Count the opening and closing pairs, starting from the innermost block.",
  },
];

export default function JsonFormatterPage() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ToolPageHeader
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Tools", href: "/#tools" },
            { label: "JSON Formatter" },
          ]}
          title="JSON Formatter & Validator"
          description="Paste JSON to pretty-print it with 2 or 4 space indentation, minify it, or check whether it parses. Everything runs locally in this tab — nothing is uploaded."
        />

        <div className="mt-6">
          <JsonFormatterTool />
        </div>

        <AdSlot slot="toolBelow" />

        <div className="mt-12 space-y-10">
          <ContentSection id="how-to" title="How to format JSON">
            <StepList
              steps={[
                {
                  title: "Paste your JSON",
                  body: "into the input panel on the left, or press “Load example” to start from a sample document.",
                },
                {
                  title: "Choose an indent size",
                  body: "using the selector above the editor. Changing it re-formats an existing result immediately.",
                },
                {
                  title: "Press Format JSON",
                  body: "or use ⌘/Ctrl + Enter. The output appears in the right-hand panel.",
                },
                {
                  title: "Copy or download",
                  body: "the result. The download button saves a .json file with a timestamped name.",
                },
              ]}
            />
          </ContentSection>

          <ContentSection id="what-it-does" title="What each button does">
            <ProseList
              items={[
                <>
                  <strong className="font-medium text-slate-900">Format JSON</strong> parses
                  the input and re-prints it with the selected indentation. Use it to turn a
                  single-line API response into something you can read.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Minify</strong> removes all
                  optional whitespace. The output is semantically identical and noticeably
                  smaller, which matters for request bodies and config files.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Validate</strong> only
                  parses the document. It leaves the output untouched, which is useful when
                  you want a yes/no answer without rewriting what is in the editor.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Swap</strong> moves the
                  output into the input. Handy when you want to re-process a result with a
                  different indent size or minify after formatting.
                </>,
              ]}
            />
          </ContentSection>

          <ContentSection id="round-trip" title="What changes besides whitespace">
            <p>
              Formatting works by parsing your text into a JavaScript value and serializing
              it again. That round trip is what makes the output consistent, and it is also
              why the bytes that come back are occasionally not the bytes you pasted. Every
              difference below comes from the engine rather than from this tool — any
              formatter built on <code className="font-mono text-[12px]">JSON.parse</code>{" "}
              behaves the same way.
            </p>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
                <caption className="sr-only">
                  Round-trip differences between pasted JSON and a JavaScript parser&apos;s
                  output
                </caption>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-3 py-2 font-semibold">
                      You paste
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      You get back
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Why
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 align-top">
                  {ROUND_TRIP.map((row) => (
                    <tr key={row.input}>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-slate-800">
                        {row.input}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-slate-800">
                        {row.output}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{row.why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Two of these bite in production. The first is precision: any id, nanosecond
              timestamp or hash sent as a bare number above 9,007,199,254,740,991 can come
              back changed. The fix is to send such values as strings in the source document
              — <code className="font-mono text-[12px]">{'{"id":"9007199254740993"}'}</code>{" "}
              — which is exactly why payment and social APIs return their ids as strings.
            </p>
            <p>
              The second is key order. If anything downstream depends on member order — some
              signing schemes and diff-based caches do — an object whose keys are all numeric
              strings will be reordered on re-serialization. Either sort explicitly on both
              sides, or stop using purely numeric keys.
            </p>
          </ContentSection>

          <ContentSection id="common-errors" title="Common JSON syntax errors">
            <p>
              The browser parser stops at the first problem it finds, so only one error is
              reported at a time. These are the messages you are most likely to see and what
              they usually mean.
            </p>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full min-w-[620px] border-collapse text-left text-[13px]">
                <caption className="sr-only">
                  Common JSON parser errors, their likely cause and how to fix them
                </caption>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Parser message
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Likely cause
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Fix
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 align-top">
                  {COMMON_ERRORS.map((row) => (
                    <tr key={row.error}>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-slate-800">
                        {row.error}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{row.cause}</td>
                      <td className="px-3 py-2.5 text-slate-600">{row.fix}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">
              Message text differs between browsers. The position is reported by the engine
              and should be treated as a pointer to the problem area rather than an exact
              diagnosis.
            </p>
          </ContentSection>

          <ContentSection id="why-format" title="Why formatting is worth the keystroke">
            <p>
              Minified JSON is optimised for machines, not people. A single missed comma in
              a four-kilobyte single-line payload can take minutes to find, because every
              character sits at the same indentation level. Re-printing the document gives
              the structure back: nesting becomes visible, array items line up, and one
              member per line means a version-control diff shows exactly which value
              changed.
            </p>
            <p>
              Formatting is also the quickest sanity check available. If a payload formats
              cleanly, it is at least syntactically valid JSON — which rules out an entire
              class of bugs before you start looking at your application logic. For a
              deeper look at <em>why</em> a document is rejected, the{" "}
              <Link href="/json-validator" className="text-blue-700 underline underline-offset-2">
                JSON validator
              </Link>{" "}
              reports the parser message together with a structure summary.
            </p>
          </ContentSection>

          <ContentSection id="privacy" title="Where your data goes">
            <p>
              Nowhere. {SITE_NAME} does not send the contents of the editor to any server.
              There is no API call behind the buttons, no analytics event containing your
              text, and no localStorage or cookie copy of it. The trade-off is deliberate:
              it keeps the tool safe for payloads that contain tokens, customer records or
              internal configuration.
            </p>
          </ContentSection>

          <FaqSection items={FAQ} path={PATH} />

          <RelatedTools current={PATH} />
        </div>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "JSON Formatter & Validator",
          url: absoluteUrl(PATH),
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript",
          description:
            "Format, minify and validate JSON in the browser without uploading the document.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          isAccessibleForFree: true,
        }}
      />
    </>
  );
}
