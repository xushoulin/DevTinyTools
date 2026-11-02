import Link from "next/link";

import { AdSlot } from "@/components/ad-slot";
import { ContentSection, InlineCode, ProseList, StepList } from "@/components/content-section";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { RelatedTools } from "@/components/related-tools";
import { ToolPageHeader } from "@/components/tool-page-header";
import { JsonEscapeTool } from "@/components/tools/json-escape-tool";
import {
  ENCODING_CASES,
  ENCODING_SIZE,
  ESCAPE_CASES,
  ESCAPE_VERSIONS,
} from "@/lib/json-references";
import { pageMetadata } from "@/lib/metadata";
import { absoluteUrl } from "@/lib/site";

const PATH = "/json-escape";

export const metadata = pageMetadata({
  title: "JSON Escape & Unescape Tool",
  description:
    "Escape text into a JSON string, or turn \\u00e9, \\n and \\\" back into plain text. Shows which sequences are not valid JSON. Runs entirely in your browser.",
  path: PATH,
});

const FAQ = [
  {
    question: "What does escaping a JSON string actually do?",
    answer:
      "It converts a backslash, a double quote and every control character into a form that is legal between the quotes of a JSON string. JSON strings cannot contain a raw double quote, a raw newline or a raw backslash, so those three have to be written as \\\" , \\n and \\\\ . Everything else in the document stays as it is.",
  },
  {
    question: "Why does my JSON contain \\u00e9 instead of é?",
    answer:
      "Because the library that produced it escapes non-ASCII by default. Python's json.dumps runs with ensure_ascii=True, so é becomes \\u00e9, ☕ becomes \\u2615 and 😀 becomes the surrogate pair \\ud83d\\ude00. Node's JSON.stringify and Ruby's JSON.generate leave those characters alone. If you want them readable, pass ensure_ascii=False in Python.",
  },
  {
    question: "How do I escape double quotes for a JSON string?",
    answer:
      "Write \\\" for every quote that sits inside the value. The quotes that delimit keys and values are structural and must not be escaped. Pasting text that already contains quotes into this tool does it for you: the default output includes the surrounding quotes, so it can be dropped straight in as a value.",
  },
  {
    question: "Is \\/ valid JSON?",
    answer:
      "Yes. The JSON grammar allows a forward slash to be written as \\/ , and every parser tested here accepts it and returns a plain slash. It is not required, though, and JSON.stringify never produces it. PHP's json_encode emits it by default unless you pass JSON_UNESCAPED_SLASHES, which is why so much PHP-generated JSON looks like it contains unnecessary backslashes.",
  },
  {
    question: "Why does \\x41 fail when JSON.parse reads it?",
    answer:
      "Because \\x is a JavaScript string escape, not a JSON one. JSON defines exactly eight escape sequences: \\\" \\\\ \\/ \\b \\f \\n \\r \\t, plus \\u followed by exactly four hex digits. V8 answers Bad escaped character in JSON, Python answers Invalid \\escape, and JSON defines no such thing, so both are correct. If your data came from a C# or JavaScript source, that is where the extra backslash is coming from.",
  },
  {
    question: "Does escaping make a JSON payload smaller?",
    answer:
      "No, it usually makes it larger, and the non-ASCII option makes it much larger. A string containing café, an emoji and two Chinese characters is 18 bytes as UTF-8 with the characters kept raw, and 31 bytes once every non-ASCII character is escaped. Escaping trades size for safety: an ASCII-only payload survives transport layers, form fields, headers and legacy systems that mangle multi-byte text.",
  },
  {
    question: "Is escaping the same as encryption, URL encoding or HTML escaping?",
    answer:
      "No, and mixing them up is a common source of double-escaped data. JSON escaping protects a value inside a JSON string; URL encoding protects a value inside a query string or path; HTML escaping protects a value inside markup; base64 turns bytes into text and is reversible by anyone. Escaping is not a security measure and hides nothing.",
  },
  {
    question: "Is the text I paste uploaded anywhere?",
    answer:
      "No. Both directions run in the tab using the browser's own JSON parser and a small local encoder. There is no request, and nothing is written to storage or analytics.",
  },
];

export default function JsonEscapePage() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ToolPageHeader
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Tools", href: "/#tools" },
            { label: "JSON Escape" },
          ]}
          title="JSON Escape & Unescape"
          description="Turn raw text into a JSON string value, or decode backslashes back into readable text. When a string is not valid JSON, the tool still decodes it but tells you exactly which sequences were invented."
        />

        <div className="mt-6">
          <JsonEscapeTool />
        </div>

        <AdSlot slot="toolBelow" />

        <div className="mt-12 space-y-10">
          <ContentSection id="how-to" title="How to escape or unescape a string">
            <StepList
              steps={[
                {
                  title: "Pick a direction",
                  body: "Escape turns plain text into a legal JSON string body. Unescape goes the other way and accepts input with or without the surrounding quotes.",
                },
                {
                  title: "Paste into the left panel",
                  body: "Conversion happens as you type; there is no run button and no upload. Use Load example to see both directions on real-looking text.",
                },
                {
                  title: "Set the two optional rules",
                  body: "Escaping non-ASCII mimics Python's default. Escaping the forward slash mimics PHP's. Leave both off to match JSON.stringify byte for byte.",
                },
                {
                  title: "Check the notice before you trust the output",
                  body: "If the input was not valid JSON, the decoded result is shown with a list of every substitution made, so you know what your own code will do with the same string.",
                },
              ]}
            />
          </ContentSection>

          <ContentSection id="what-escaping-is" title="Escaping is about the container, not the data">
            <p>
              A JSON string is delimited by double quotes, so it cannot contain a raw double
              quote. It also cannot contain a raw newline, a raw tab or a raw backslash, because
              those bytes would either end the string early or start an escape sequence. Escaping
              rewrites exactly those characters and nothing else.
            </p>
            <p>
              It helps to see which characters actually get touched. Run any text through{" "}
              <InlineCode>JSON.stringify</InlineCode> and you get:
            </p>
            <ProseList
              items={[
                <>
                  <InlineCode>{'\\"'}</InlineCode>, <InlineCode>{"\\\\"}</InlineCode> and{" "}
                  <InlineCode>{"\\/"}</InlineCode> for the quote, the backslash and the optional
                  slash.
                </>,
                <>
                  <InlineCode>{"\\b"}</InlineCode>, <InlineCode>{"\\f"}</InlineCode>,{" "}
                  <InlineCode>{"\\n"}</InlineCode>, <InlineCode>{"\\r"}</InlineCode> and{" "}
                  <InlineCode>{"\\t"}</InlineCode> for five of the control characters.
                </>,
                <>
                  <InlineCode>{"\\u00XX"}</InlineCode> for the remaining nineteen control
                  characters, which have no short form.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Nothing else.</strong> Accented
                  letters, emoji, CJK and the del character U+007F are left exactly as they are by
                  V8.
                </>,
              ]}
            />
            <p>
              That last point is where implementations disagree, and it is the reason this page
              carries a measured table instead of a description.
            </p>
          </ContentSection>

          <ContentSection id="encoding-defaults" title="Why your JSON suddenly contains \\u00e9">
            <p>
              Hand the same four characters to three serializers and you get three different
              answers. This is measured on {ESCAPE_VERSIONS.node}, {ESCAPE_VERSIONS.python} and{" "}
              {ESCAPE_VERSIONS.ruby}, each with default arguments:
            </p>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full border-collapse text-left text-[13px]">
                <caption className="sr-only">
                  How three serializers encode the same character by default
                </caption>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Character
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Node
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Python
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Ruby
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ENCODING_CASES.map((row) => (
                    <tr key={row.label}>
                      <td className="px-3 py-2 text-slate-700">{row.label}</td>
                      <td className="px-3 py-2 font-mono text-[12px] text-slate-900">{row.node}</td>
                      <td className="px-3 py-2 font-mono text-[12px] text-slate-900">
                        {row.python}
                      </td>
                      <td className="px-3 py-2 font-mono text-[12px] text-slate-900">{row.ruby}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Python is the outlier. Its <InlineCode>json.dumps</InlineCode> escapes every
              non-ASCII character by default, so a document that looked fine in development turns
              into a wall of <InlineCode>{"\\u"}</InlineCode> sequences as soon as it is produced
              by Python. That is not corruption and nothing was lost —{" "}
              <InlineCode>json.loads</InlineCode> restores it exactly — but it is unreadable, and
              it is the single most common reason people go looking for an unescape tool.
            </p>
            <p>
              The cost is measurable. The string{" "}
              <InlineCode>{ENCODING_SIZE.sample}</InlineCode> is {ENCODING_SIZE.rawBytes} bytes in
              UTF-8 with the characters kept raw, and {ENCODING_SIZE.escapedBytes} bytes once all
              of it is escaped: same data, {Math.round(
                (ENCODING_SIZE.escapedBytes / ENCODING_SIZE.rawBytes - 1) * 100,
              )}
              % larger, and pure ASCII. That trade is worth making when a value has to survive a
              header, a form field or a legacy system that mangles multi-byte text. It is a bad
              trade for a payload you are paying to transfer.
            </p>
            <p>
              One further disagreement, small but real: the character U+007F (delete). V8 leaves it
              raw, Python writes <InlineCode>{"\\u007f"}</InlineCode> and Ruby writes{" "}
              <InlineCode>{"\\u007F"}</InlineCode> with an upper-case hex digit. All three outputs
              parse back to the same string, so nothing breaks — but a byte-for-byte comparison of
              two &ldquo;identical&rdquo; files can fail for this reason alone.
            </p>
          </ContentSection>

          <ContentSection
            id="invalid-escapes"
            title="Sequences that are not JSON, and what each parser does"
          >
            <p>
              This is the part that turns a five-minute bug into an afternoon. JSON defines eight
              escape sequences. Everything else is invalid — but parsers disagree about what to do
              with invalid input, and the disagreement is not theoretical. Each cell below is the
              literal output of running that sequence through the parser:
            </p>

            <div className="space-y-3">
              {ESCAPE_CASES.map((row) => (
                <div
                  key={row.sequence}
                  className="rounded-lg border border-slate-200 bg-white p-3.5"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-900">
                      {row.sequence}
                    </code>
                    <span className="text-[13px] text-slate-600">{row.intent}</span>
                  </div>
                  <dl className="mt-2.5 grid gap-1.5 text-[12px] sm:grid-cols-3 sm:gap-3">
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-slate-400">Node</dt>
                      <dd className="font-mono leading-snug text-slate-800">{row.node}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-slate-400">Python</dt>
                      <dd className="font-mono leading-snug text-slate-800">{row.python}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-slate-400">Ruby</dt>
                      <dd className="font-mono leading-snug text-slate-800">{row.ruby}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>

            <p>
              Two rows deserve a second look, because they point in opposite directions. Ruby 2.6
              accepts <InlineCode>{"\\x41"}</InlineCode>, <InlineCode>{"\\0"}</InlineCode>,{" "}
              <InlineCode>{"\\'"}</InlineCode> and any other unknown escape by silently dropping
              the backslash: <InlineCode>{"\\x41"}</InlineCode> comes back as the three characters{" "}
              <InlineCode>x41</InlineCode>, not as <InlineCode>A</InlineCode>. Node and Python both
              reject all four. Then the same Ruby rejects a lone surrogate that Node and Python
              both accept.
            </p>
            <p>
              So &ldquo;is my JSON valid?&rdquo; has no single answer at the edge. A string can pass in one
              runtime and fail in another, and the failure message will not mention that the other
              parser was happy. If a value travels between services, validate it with the same
              parser that will eventually read it — the{" "}
              <Link href="/json-validator" className="text-blue-700 underline underline-offset-2">
                JSON validator
              </Link>{" "}
              uses V8, which is what a browser and Node will use.
            </p>
            <p>
              The practical rule is narrow and worth memorising: inside a JSON string, a backslash
              may only be followed by <InlineCode>{'"'}</InlineCode>,{" "}
              <InlineCode>{"\\"}</InlineCode>, <InlineCode>/</InlineCode>,{" "}
              <InlineCode>b</InlineCode>, <InlineCode>f</InlineCode>, <InlineCode>n</InlineCode>,{" "}
              <InlineCode>r</InlineCode>, <InlineCode>t</InlineCode> or{" "}
              <InlineCode>u</InlineCode> plus exactly four hex digits. Anything else is a bug, even
              where a parser forgives it.
            </p>
          </ContentSection>

          <ContentSection id="strict-then-lenient" title="Why this tool decodes input that JSON rejects">
            <p>
              Most unescapers just replace backslash sequences and hand you a result, which hides
              the only fact you needed: your string was never valid JSON. This one tries the
              browser&apos;s own parser first, so a valid string is decoded by the same code your
              application uses and cannot drift from it.
            </p>
            <p>
              Only when that parser refuses the input does the tool fall back to a lenient pass, and
              then it reports what it changed: <InlineCode>{"\\x41"}</InlineCode> became{" "}
              <InlineCode>A</InlineCode> once, <InlineCode>{"\\q"}</InlineCode> lost its backslash
              once. You get the text you were after, plus the exact reason your code threw.
            </p>
            <p>
              That distinction matters when the input came from somewhere you cannot change — a log
              line, a queue message, a third-party export. If the tool says{" "}
              <em>repaired</em>, the fix belongs upstream, not in a bigger try/catch.
            </p>
          </ContentSection>

          <ContentSection id="not-encryption" title="Escaping is not encoding, and neither is security">
            <p>
              Four different transformations get called &ldquo;escaping&rdquo;, and applying the wrong one twice
              is how payloads end up as <InlineCode>{"\\\\\\\\u00e9"}</InlineCode>:
            </p>
            <ProseList
              items={[
                <>
                  <strong className="font-medium text-slate-900">JSON escaping</strong> protects a
                  value inside a JSON string. Defined by RFC 8259, eight sequences, handled by this
                  page.
                </>,
                <>
                  <strong className="font-medium text-slate-900">URL encoding</strong> protects a
                  value inside a query string or a path. Spaces become{" "}
                  <InlineCode>%20</InlineCode>, and it is applied to the whole value, not to
                  individual characters inside it.
                </>,
                <>
                  <strong className="font-medium text-slate-900">HTML escaping</strong> protects a
                  value inside markup. <InlineCode>{"<"}</InlineCode> becomes{" "}
                  <InlineCode>{"&lt;"}</InlineCode>. Applying it to JSON is a common cause of{" "}
                  <InlineCode>{"&quot;"}</InlineCode> appearing where a quote was expected.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Base64</strong> is not escaping at
                  all. It converts bytes to ASCII text and hides nothing — anyone can reverse it,
                  which is why it is not encryption either.
                </>,
              ]}
            />
            <p>
              None of these is a security control. Escaping changes how a value is written down for
              one specific container; it does not authenticate it, and it does not stop anyone from
              reading it.
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
          name: "JSON Escape & Unescape",
          url: absoluteUrl(PATH),
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript",
          description:
            "Escape text into a JSON string or decode escaped sequences back to plain text, in the browser.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          isAccessibleForFree: true,
        }}
      />
    </>
  );
}
