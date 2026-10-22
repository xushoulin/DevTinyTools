import Link from "next/link";
import { ContentSection, ProseList } from "@/components/content-section";
import { FaqSection } from "@/components/faq-section";
import { GuideShell } from "@/components/guide-shell";
import { getGuide } from "@/lib/guides";
import { ROUND_TRIP } from "@/lib/json-references";
import { pageMetadata } from "@/lib/metadata";

const SLUG = "why-json-numbers-lose-precision";
const guide = getGuide(SLUG)!;

export const metadata = pageMetadata({
  title: guide.title,
  description: guide.description,
  path: guide.href,
});

const CODE = "overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-[12px] leading-relaxed text-slate-200";

const FAQ = [
  {
    question: "Is this a bug in the formatter?",
    answer:
      "No. The change happens inside JSON.parse, before any tool can intervene: the literal is converted to a 64-bit float the moment the document is read. A formatter that claimed to preserve 9007199254740993 as a number would be lying about what the runtime holds afterwards.",
  },
  {
    question: "Which numbers are safe?",
    answer:
      "Integers between -(2^53 - 1) and 2^53 - 1, that is -9007199254740991 to 9007199254740991. Everything in that range maps to a double with no loss. Above it, consecutive integers collapse onto the same value and Number.isSafeInteger returns false.",
  },
  {
    question: "Do I lose precision in Python or Go too?",
    answer:
      "Python's json module parses integers as arbitrary-precision int by default, so it keeps the value. Go's encoding/json decodes into float64 by default, so it loses the same way V8 does. The lesson is that the behaviour depends on the parser, not on the JSON text.",
  },
  {
    question: "Can I just stringify and parse back to fix it?",
    answer:
      "No — that is the round trip that caused the loss. The value is already a double; stringifying it writes the corrupted digits out. You have to stop it from becoming a double in the first place, either by treating the field as a string or by intercepting the parse.",
  },
];

export default function Page() {
  return (
    <GuideShell guide={guide}>
      <ContentSection id="spec-vs-runtime" title="The spec allows it; the runtime does not">
        <p>
          RFC 8259 does not put a size limit on numbers. It explicitly allows
          implementations to set limits on range and precision, and then warns that
          integers outside ±(2^53 − 1) “indicate potential interoperability problems”.
          That sentence is the whole story: the format permits a 20-digit integer, and the
          runtime almost everyone parses it with cannot hold one.
        </p>
        <p>
          JavaScript has exactly one numeric type. <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">JSON.parse</code>{" "}
          converts every number literal to a 64-bit float, so a 19-digit ID becomes an
          approximation before your code ever sees it. Nothing about the document was
          malformed — the container was too small.
        </p>
      </ContentSection>

      <ContentSection id="boundary" title="Where the boundary is">
        <p>
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">Number.MAX_SAFE_INTEGER</code>{" "}
          is 9007199254740991, which is 2^53 − 1. An integer at or below that is
          represented exactly. The next integer, 9007199254740992, is 2^53 and is still
          exact, but 9007199254740993 does not exist as a double — it rounds down to
          9007199254740992, and so does every odd number after it until the next power of
          two.
        </p>
        <p>
          This is why the failure is so easy to miss: an 18-digit snowflake ID is well
          inside the range of a 64-bit integer and well outside the range of a double.
          APIs that use snowflakes — and databases that return 64-bit primary keys — hit
          this constantly.
        </p>
      </ContentSection>

      <ContentSection id="round-trip" title="What a round trip actually changes">
        <p>
          Paste the left column into any formatter, press Format, and you get the middle
          column. Every row below was produced by running the input through{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">JSON.parse</code>{" "}
          then <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">JSON.stringify</code>.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
            <caption className="sr-only">Document changes caused by a parse and stringify round trip</caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-3 py-2 font-semibold">
                  Input
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  After round trip
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Why
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {ROUND_TRIP.map((row) => (
                <tr key={row.input}>
                  <td className="px-3 py-2.5 font-mono text-[11px] break-words text-slate-800">
                    {row.input}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] break-words text-slate-800">
                    {row.output}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{row.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Only the first row is a real information loss. The other four are
          normalisation: the bytes differ, the meaning does not. That distinction matters
          when you diff two documents — a diff of formatted output will report changes that
          no human made.
        </p>
      </ContentSection>

      <ContentSection id="key-order" title="Object key order is not insertion order">
        <p>
          The second row of that table is the one people rarely expect. A JavaScript
          object enumerates integer-like keys first, in ascending numeric order, then the
          remaining string keys in the order they were inserted. JSON itself defines no
          order at all — it is a set of name/value pairs — so any consumer that depends on
          member order was relying on undefined behaviour to begin with.
        </p>
        <p>
          If order is part of your payload, it has to live in the data: an array of objects
          with an explicit <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">position</code>{" "}
          field, not the order the bytes happened to arrive in.
        </p>
      </ContentSection>

      <ContentSection id="keeping-integers" title="Keeping big integers intact">
        <p>
          There are three practical options, in order of how much you should prefer them.
        </p>
        <ProseList
          items={[
            <>
              <strong className="font-medium text-slate-900">
                Make the field a string in the API.
              </strong>{" "}
              This is what most large platforms do. <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">{"{\"id\":\"9007199254740993\"}"}</code>{" "}
              is unambiguous, survives every parser, and costs one pair of quotes. Nobody
              then has to remember the rule.
            </>,
            <>
              <strong className="font-medium text-slate-900">
                Intercept the parse with a reviver.
              </strong>{" "}
              A reviver can inspect each value before your code sees it. Recent V8 engines —
              verified on Node 22.22.2 for this article — pass a third argument exposing the
              raw literal, which is what makes this reliable rather than guesswork:
            </>,
            <>
              <strong className="font-medium text-slate-900">
                Use a lossless parser.
              </strong>{" "}
              Libraries such as <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">lossless-json</code>{" "}
              keep the original text of each number and hand you a wrapper type. They work
              everywhere, at the cost of a dependency and a slightly unusual value type.
            </>,
          ]}
        />
        <pre className={CODE}>
          <code>{`JSON.parse(text, (key, value, context) => {
  // context.source is the literal exactly as written in the document.
  const raw = context?.source;
  if (typeof value === "number" && !Number.isSafeInteger(value)
      && raw && /^-?\\d+$/.test(raw)) {
    return BigInt(raw);
  }
  return value;
});`}</code>
        </pre>
        <p>
          Feature-detect it rather than trusting it blindly: if{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">context</code> is
          undefined, the engine predates the feature and the value has already lost its
          digits — in that case fall back to a string field or a lossless parser.
        </p>
      </ContentSection>

      <ContentSection id="signing" title="If you hash or sign JSON">
        <p>
          A round trip is not byte-stable, so never re-serialise a payload that was signed.
          Two documents can be semantically identical and hash differently because of
          whitespace, key order or number formatting, and a payload that went through{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">JSON.parse</code>{" "}
          and back may no longer match its own signature.
        </p>
        <p>
          Sign the exact bytes you send: serialise once, hash that string, transmit the same
          string. On the receiving side, verify before parsing. The{" "}
          <Link href="/json-minifier" className="text-blue-700 underline underline-offset-2">
            JSON Minifier
          </Link>{" "}
          page covers the size side of the same rule.
        </p>
      </ContentSection>

      <FaqSection items={FAQ} path={guide.href} />
    </GuideShell>
  );
}
