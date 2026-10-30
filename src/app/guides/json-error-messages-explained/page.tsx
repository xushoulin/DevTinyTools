import Link from "next/link";
import { ContentSection, ProseList } from "@/components/content-section";
import { FaqSection } from "@/components/faq-section";
import { GuideShell } from "@/components/guide-shell";
import { getGuide } from "@/lib/guides";
import { ENGINE_MESSAGES, CROSS_ENGINE_CASES, CROSS_ENGINE_VERSIONS } from "@/lib/json-references";
import { pageMetadata } from "@/lib/metadata";

const SLUG = "json-error-messages-explained";
const guide = getGuide(SLUG)!;

export const metadata = pageMetadata({
  title: guide.title,
  description: guide.description,
  path: guide.href,
});

const FAQ = [
  {
    question: "Why is the same document valid in my editor but invalid in my code?",
    answer:
      "Editors usually accept JSON5 or JSONC — comments, trailing commas and single quotes. A strict RFC 8259 parser accepts none of them. If your editor shows no error but JSON.parse fails, the most likely causes are a trailing comma, a comment, or a single-quoted key.",
  },
  {
    question: "What does “Unexpected end of JSON input” mean?",
    answer:
      "The document stopped before the parser finished reading it. Something opened and never closed: a brace, a bracket or a string quote. Count the pairs from the innermost block outwards, or paste the document into the validator to see the deepest point it reached.",
  },
  {
    question: "Is the position number zero-based or one-based?",
    answer:
      "The position is a zero-based character offset, while the column is one-based. For {\"a\":1,} the parser reports position 7, which is the eighth character — the closing brace. When the error is at the end of the input, the position can equal the length of the string.",
  },
  {
    question: "Can the reported location be wrong?",
    answer:
      "It is never wrong about where the parser stopped, but that is not always where the mistake is. A missing comma is only noticed when the parser meets the next key, so the reported position sits a few characters after the real cause. Read the message as “I gave up here”, not “the problem is here”.",
  },
  {
    question: "“Expecting value: line 1 column 1 (char 0)” — what is wrong?",
    answer:
      "That is Python’s message, and column 1 means it found nothing parseable at the very first character. The usual causes are an empty response body, an HTML error page instead of JSON, or a byte-order mark. Print the first twenty characters of the string before parsing it.",
  },
  {
    question: "Why does MySQL say “The document is empty”?",
    answer:
      "MySQL 8 rejects an empty string passed to a JSON column or CAST … AS JSON with that wording, which no JavaScript parser uses. It means the same thing as an empty response body: the column or driver received zero characters, so no parsing ever started.",
  },
];

const ENGINE_ROWS = [
  { label: "Node 22", key: "node" },
  { label: "Python", key: "python" },
  { label: "MySQL", key: "mysql" },
] as const;

export default function Page() {
  return (
    <GuideShell guide={guide}>
      <ContentSection id="what-the-message-means" title="The message says where, not what">
        <p>
          A strict JSON parser reads left to right and stops at the first character it
          cannot accept. The text it throws back describes that moment: the token it
          found, sometimes the position, and a phrase like “Expected property name”. It
          never tells you which of the ten possible mistakes you actually made — that
          inference is still yours.
        </p>
        <p>
          This matters because the reported position is usually a few characters{" "}
          <em>after</em> the real mistake. A missing comma is not noticed until the
          parser meets the next key. An unclosed brace is not noticed until the end of
          the file, so the error points at the last line instead of the line you forgot
          to close.
        </p>
      </ContentSection>

      <ContentSection id="seven-messages" title="Seven messages you will actually see">
        <p>
          These are not paraphrased. Each message below is what the engine returned for
          the input beside it, captured on Node 22.22.2 — the same V8 that ships in
          current Chrome and Edge.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[680px] border-collapse text-left text-[13px]">
            <caption className="sr-only">
              Real parser messages for common JSON mistakes
            </caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-3 py-2 font-semibold">
                  Input
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Message
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  What it means
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {ENGINE_MESSAGES.map((row) => (
                <tr key={row.input}>
                  <td className="px-3 py-2.5 font-mono text-[12px] whitespace-nowrap text-slate-800">
                    {row.input}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] leading-relaxed break-words text-slate-700">
                    {row.message}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          Messages are not part of any specification, so an engine update can reword
          them. The position, when present, is the part that stays meaningful.
        </p>
      </ContentSection>

      <ContentSection id="position-line-column" title="Reading position, line and column">
        <p>
          The three numbers are not redundant. <strong className="font-medium text-slate-900">Position</strong>{" "}
          is a zero-based offset into the whole document, which is what you need when you
          are slicing the string programmatically.{" "}
          <strong className="font-medium text-slate-900">Line</strong> and{" "}
          <strong className="font-medium text-slate-900">column</strong> are one-based and
          exist so a human can find the spot in an editor.
        </p>
        <p>
          Take <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">{`{"a":1,}`}</code>
          . The message reports position 7, line 1, column 8. Position 7 is the eighth
          character — the closing brace — and column 8 is the same character counted from
          one. When the input ends prematurely, as in{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">{`{"a":1`}</code>,
          the position equals the length of the string, which is the parser saying “I
          needed another character and there was none”.
        </p>
      </ContentSection>

      <ContentSection id="no-position" title="When there is no location at all">
        <p>
          Two of the seven rows above carry no position, only the document echoed back.
          That is not a bug and it is not rare: some failure paths produce a message
          shaped <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">
            Unexpected token &apos;X&apos;, &quot;…&quot; is not valid JSON
          </code>{" "}
          with the offending snippet inlined instead of a number.
        </p>
        <p>
          The workaround is to re-read the document with the same grammar rules and report
          the first offset where reading cannot continue. That is what the{" "}
          <Link href="/json-validator" className="text-blue-700 underline underline-offset-2">
            JSON Validator
          </Link>{" "}
          does, and it labels those locations{" "}
          <strong className="font-medium text-slate-900">approximate</strong> — at the exact
          boundary character, two readings can both be defensible, so pretending to
          single-character precision would be dishonest.
        </p>
      </ContentSection>

      <ContentSection id="common-causes" title="The causes that cover most failures">
        <p>
          Almost every “invalid JSON” you will meet is one of these. They are ordered by
          how often they appear in practice, not by how interesting they are.
        </p>
        <ProseList
          items={[
            <>
              <strong className="font-medium text-slate-900">A trailing comma.</strong>{" "}
              Allowed in JavaScript, Python dicts and JSON5; forbidden in JSON. The error
              usually says a property name was expected.
            </>,
            <>
              <strong className="font-medium text-slate-900">A comment.</strong>{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">{"//"}</code> and{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">{`/* */`}</code>{" "}
              are not JSON. A config file that someone “cleaned up” with comments is the
              classic source.
            </>,
            <>
              <strong className="font-medium text-slate-900">Unquoted or single-quoted keys.</strong>{" "}
              Keys must be double-quoted strings. <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">{`{a:1}`}</code>{" "}
              and <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">{`{'a':1}`}</code>{" "}
              fail identically.
            </>,
            <>
              <strong className="font-medium text-slate-900">An unclosed brace, bracket or quote.</strong>{" "}
              Reported at the end of the input, not where the opening character sits.
            </>,
            <>
              <strong className="font-medium text-slate-900">A missing comma between members.</strong>{" "}
              Reported when the parser meets the next key, one position later than you
              would like.
            </>,
            <>
              <strong className="font-medium text-slate-900">Two top-level values.</strong>{" "}
              A concatenated stream of NDJSON lines is not one JSON document. Parse it line
              by line instead.
            </>,
            <>
              <strong className="font-medium text-slate-900">
                JavaScript literals that are not JSON.
              </strong>{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">NaN</code>,{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">Infinity</code>,{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">undefined</code>{" "}
              and <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">0x10</code>{" "}
              are all valid JavaScript and all invalid JSON.
            </>,
            <>
              <strong className="font-medium text-slate-900">A byte-order mark.</strong> The
              BOM is invisible, sits before the first <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">{`{`}</code>,
              and produces an error at the very start of a document that otherwise looks
              perfect. Files exported from Excel are a common source.
            </>,
            <>
              <strong className="font-medium text-slate-900">Smart quotes.</strong> Text
              pasted from a word processor can carry{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">“ ”</code>{" "}
              instead of <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">{'"'}</code>.
              They look identical at a glance and are different bytes.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection
        id="same-failure-other-engines"
        title="The same failure, worded by three engines"
      >
        <p>
          If the message you are staring at is not in the list above, it came from a
          different engine. These five inputs were run through {CROSS_ENGINE_VERSIONS.node},{" "}
          {CROSS_ENGINE_VERSIONS.python} and {CROSS_ENGINE_VERSIONS.mysql}. Nothing below
          is paraphrased, and nothing was taken from documentation.
        </p>
        <div className="space-y-3">
          {CROSS_ENGINE_CASES.map((row) => (
            <div
              key={row.scenario}
              className="rounded-lg border border-slate-200 bg-white p-3.5"
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-800">
                  {row.input === "" ? "(empty string)" : row.input}
                </code>
                <span className="text-xs text-slate-500">{row.scenario}</span>
              </div>
              <dl className="mt-2.5 space-y-1.5">
                {ENGINE_ROWS.map((engine) => {
                  const message = row[engine.key];
                  return (
                    <div
                      key={engine.label}
                      className="grid gap-x-3 gap-y-0.5 sm:grid-cols-[5rem_1fr]"
                    >
                      <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                        {engine.label}
                      </dt>
                      <dd
                        className={
                          message === null
                            ? "font-mono text-[11px] leading-relaxed break-words text-emerald-700"
                            : "font-mono text-[11px] leading-relaxed break-words text-slate-700"
                        }
                      >
                        {message ?? "accepted, no error"}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))}
        </div>
        <p>
          Two things follow. First, search for the wording you actually see:{" "}
          <em>The document is empty</em> exists only in MySQL&apos;s phrasing, so a page
          that lists V8 messages alone cannot answer it. Second,{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">
            line 1 column 1 (char 0)
          </code>{" "}
          is Python saying it never got started — an empty body and a complete HTML page
          produce the same message and the same position, so the number tells you nothing
          about the cause.
        </p>
        <p>
          The last row is the interesting one. Python accepts <code>NaN</code> and returns
          a float, while V8 and MySQL both reject it. RFC 8259 defines no such literal, so
          a strict reading says Python is wrong here — which is why “is this valid JSON”
          has more than one answer in practice. If a document has to be interchangeable,
          keep it to the value types the specification defines.
        </p>
      </ContentSection>

      <ContentSection id="wording-differs" title="The wording is not portable">
        <p>
          Every engine invents its own phrasing. The same trailing comma that V8 describes as
          an expected property name is reported differently by Python&apos;s{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">json</code> module,
          by Go&apos;s <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">encoding/json</code>{" "}
          and by Java&apos;s Jackson, and none of those strings are API-stable.
        </p>
        <p>
          The practical consequence: never parse the message. If you need to react to a
          failure in code, catch the exception, treat it as “invalid”, and surface the
          message to a human. Writing a regular expression against “Unexpected token” will
          break on the next runtime upgrade — which is exactly why the validator here
          reports the message verbatim instead of mapping it to a friendlier string.
        </p>
      </ContentSection>

      <FaqSection items={FAQ} path={guide.href} />
    </GuideShell>
  );
}
