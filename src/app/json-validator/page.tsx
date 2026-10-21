import Link from "next/link";
import { AdSlot } from "@/components/ad-slot";
import { ContentSection, ProseList } from "@/components/content-section";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { RelatedTools } from "@/components/related-tools";
import { ToolPageHeader } from "@/components/tool-page-header";
import { JsonValidatorTool } from "@/components/tools/json-validator-tool";
import { pageMetadata } from "@/lib/metadata";
import { absoluteUrl } from "@/lib/site";

const PATH = "/json-validator";

export const metadata = pageMetadata({
  title: "JSON Validator",
  description:
    "Validate JSON online and see the line, column and a plain-English explanation of the error, plus a structure summary of the parsed document.",
  path: PATH,
});

const FAQ = [
  {
    question: "What does “valid JSON” mean on this page?",
    answer:
      "It means the text can be parsed by a strict JSON parser as defined by RFC 8259: one top-level value, double-quoted strings, and no trailing commas, comments or unquoted keys. It says nothing about whether the data fits your application's expectations.",
  },
  {
    question: "Does this check my JSON Schema?",
    answer:
      "No. This page only checks syntax. Schema validation — required fields, types, string formats, numeric ranges — needs a schema-aware validator and the schema document itself. Treat a green result here as “the parser accepts the text”, not “the payload is correct”.",
  },
  {
    question: "Why is a valid JavaScript object rejected?",
    answer:
      "JavaScript object literals are more permissive than JSON. They allow single quotes, unquoted keys, trailing commas, comments and functions. JSON allows none of those, so a snippet copied out of a .js file often fails here even though it runs in Node or the browser.",
  },
  {
    question: "How accurate is the reported line and column?",
    answer:
      "The position comes from your browser's JSON parser, which is accurate about where parsing stopped. The message wording differs between engines, and parsers only report the first problem they encounter. Use the location to find the problem area, then read the surrounding lines yourself.",
  },
  {
    question: "What do the structure numbers mean?",
    answer:
      "“Values parsed” counts every node in the document, including primitives. “Object keys” counts members across all objects, “array items” counts entries across all arrays, and “nesting depth” is the deepest level reached, where the root counts as level 1.",
  },
  {
    question: "Does it accept NDJSON or JSON Lines?",
    answer:
      "No. A JSON document must contain exactly one top-level value, so newline-delimited JSON with several objects will fail with an error about extra content. Validate one line at a time, or wrap the lines into an array first.",
  },
  {
    question: "Is the document uploaded anywhere?",
    answer:
      "No. Validation happens in this browser tab. Nothing is sent to a server, and the input is not stored in a cookie, localStorage or analytics event.",
  },
];

export default function JsonValidatorPage() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ToolPageHeader
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Tools", href: "/#tools" },
            { label: "JSON Validator" },
          ]}
          title="JSON Validator"
          description="Check whether a document is syntactically valid JSON. You get the parser's message, the location it stopped at, and a summary of the structure it found — without changing a single character of your input."
        />

        <div className="mt-6">
          <JsonValidatorTool />
        </div>

        <AdSlot slot="toolBelow" />

        <div className="mt-12 space-y-10">
          <ContentSection id="how-to" title="How to validate a document">
            <ProseList
              items={[
                <>
                  Paste the document into the editor, or load one of the two samples: a
                  valid configuration file and a broken one with a trailing comma.
                </>,
                <>
                  Press <strong className="font-medium text-slate-900">Validate JSON</strong>.
                  The result replaces the placeholder below the editor.
                </>,
                <>
                  If the document is valid, a structure summary shows its top-level type,
                  nesting depth and how many values were parsed.
                </>,
                <>
                  If it is not, the parser message is shown with the line and column where
                  parsing stopped, the offending line of source, and possible causes.
                </>,
              ]}
            />
            <p>
              Turning on <strong className="font-medium text-slate-900">Check as I type</strong>{" "}
              re-validates automatically after a short pause. It is disabled for documents
              above 100,000 characters so typing stays responsive.
            </p>
          </ContentSection>

          <ContentSection id="vs-formatter" title="Validator or formatter?">
            <p>
              Both tools parse the document, so both catch syntax errors. The difference is
              what happens next. The{" "}
              <Link href="/json-formatter" className="text-blue-700 underline underline-offset-2">
                formatter
              </Link>{" "}
              rewrites your text into an indented version, which is what you want when the
              goal is readability. This page never rewrites anything: it answers a yes/no
              question and, when the answer is no, explains what the parser objected to.
            </p>
            <p>
              That makes it the better choice when you are debugging a payload from a log
              file or a failing request, where you care about the error and not about the
              formatting.
            </p>
          </ContentSection>

          <ContentSection id="syntax-rules" title="The rules a document has to follow">
            <ProseList
              items={[
                <>
                  <strong className="font-medium text-slate-900">One top-level value.</strong>{" "}
                  An object, array, string, number, boolean or null — but only one, with
                  nothing but whitespace around it.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Double quotes only.</strong>{" "}
                  Strings and property names must use straight double quotes. Single quotes
                  and smart quotes are rejected.
                </>,
                <>
                  <strong className="font-medium text-slate-900">No trailing commas.</strong>{" "}
                  A comma separates members; it must not follow the last one.
                </>,
                <>
                  <strong className="font-medium text-slate-900">No comments.</strong> JSON
                  has no // or /* */ syntax. JSONC and JSON5 exist as separate formats.
                </>,
                <>
                  <strong className="font-medium text-slate-900">No bare words.</strong> NaN,
                  Infinity, undefined and function calls are not values in JSON.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Escaped control characters.</strong>{" "}
                  A literal newline inside a string is invalid; use \n instead.
                </>,
              ]}
            />
          </ContentSection>

          <ContentSection id="reading-errors" title="Reading a parser error">
            <p>
              A strict JSON parser stops at the first byte it cannot accept. That is why the
              reported position often points slightly after the real mistake: a missing comma
              is only noticed when the parser meets the next key, and an unclosed brace is
              reported at the end of the file.
            </p>
            <p>
              The usual order of investigation is: look at the reported line, check the
              character before the reported column, then walk outwards to the enclosing block.
              If the message mentions the end of the input, the problem is an unmatched
              opening brace, bracket or quote rather than the last line itself.
            </p>
            <p className="text-xs text-slate-500">
              Browsers do not agree on error wording, and the same document can produce
              different messages in Chrome, Firefox and Safari. The line and column shown
              here come from your browser and are best treated as a pointer.
            </p>
          </ContentSection>

          <ContentSection id="structure-summary" title="Why a structure summary helps">
            <p>
              A document can be perfectly valid and still be wrong: an empty array where you
              expected data, a depth of twelve where you expected three, or 4,000 values where
              you expected 40. The summary shows those numbers immediately, which is often
              faster than scrolling through a collapsed tree in your browser&apos;s developer
              tools.
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
          name: "JSON Validator",
          url: absoluteUrl(PATH),
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript",
          description:
            "Validate JSON syntax in the browser with parser messages, error location and a structure summary.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          isAccessibleForFree: true,
        }}
      />
    </>
  );
}
