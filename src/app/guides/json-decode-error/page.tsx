import Link from "next/link";
import {
  CodeBlock,
  ContentSection,
  InlineCode,
  ProseList,
} from "@/components/content-section";
import { FaqSection } from "@/components/faq-section";
import { GuideShell } from "@/components/guide-shell";
import { getGuide } from "@/lib/guides";
import { pageMetadata } from "@/lib/metadata";
import {
  BYTES_CASES,
  DECODE_CASES,
  PYTHON_VERSIONS,
  TRAILING_COMMA_BY_VERSION,
} from "@/lib/python-decode";

const SLUG = "json-decode-error";
const guide = getGuide(SLUG)!;

export const metadata = pageMetadata({
  title: guide.title,
  description: guide.description,
  path: guide.href,
});

/**
 * The four inputs that all report `line 1 column 1 (char 0)`, paired with what
 * V8 says about the same bytes. Pulled from the table below, not retyped.
 */
const POSITION_ZERO = DECODE_CASES.filter(
  (row) => row.message === "Expecting value" && row.position === "line 1 column 1 (char 0)",
);

const FAQ = [
  {
    question: "What does “Expecting value: line 1 column 1 (char 0)” mean?",
    answer:
      "It means the parser found nothing it could read as a value at the very start of the input, and gave up immediately. Python reports this one message for an empty body, an HTML page, a document wrapped in single quotes and a copied JavaScript assignment — four unrelated problems with one shared symptom, which is why the message is so unhelpful.",
  },
  {
    question: "Why does Python say line 1 column 1 when my file has 500 lines?",
    answer:
      "Because the parser never got past the first byte. When the very first character cannot begin a value, there is no deeper position to report, so the position is the start of the input rather than the line you were editing. If you expected an error on line 300, the real problem is upstream: the response body is probably empty or is not JSON at all.",
  },
  {
    question: "Why did “Expecting property name enclosed in double quotes” become “Illegal trailing comma”?",
    answer:
      "CPython changed that message in 3.13. On 3.9, 3.10 and 3.12 a trailing comma reports “Expecting property name enclosed in double quotes: line 1 column 9 (char 8)”. On 3.13 the same input reports “Illegal trailing comma before end of object: line 1 column 8 (char 7)”. The wording and the column both moved, so a fix written against an older traceback points one character too far right.",
  },
  {
    question: "Why does json.loads accept a BOM when I read bytes but reject it as text?",
    answer:
      "Because the bytes path detects the encoding first. Handed bytes, Python inspects the leading bytes, recognises a BOM and decodes accordingly, including UTF-16. Handed an already-decoded string, the BOM is simply the character U+FEFF sitting where a value should be, and JSON has no meaning for it.",
  },
  {
    question: "Does json.loads reject NaN?",
    answer:
      "No. NaN, Infinity and -Infinity are accepted by default, while V8 rejects all three. That asymmetry is why a payload can parse in a Python service and fail in the browser that receives the same bytes.",
  },
  {
    question: "Which exception should I catch?",
    answer:
      "json.JSONDecodeError, but that is not enough on its own. If the response is not valid UTF-8, json.loads raises UnicodeDecodeError before parsing starts, and that exception does not inherit from JSONDecodeError, so a handler that catches only the JSON error will still crash on a Latin-1 byte.",
  },
];

export default function Page() {
  return (
    <GuideShell guide={guide}>
      <ContentSection id="what-the-exception-carries" title="What the exception actually carries">
        <p>
          <InlineCode>json.JSONDecodeError</InlineCode> is a subclass of{" "}
          <InlineCode>ValueError</InlineCode> with four useful attributes, and most code
          catches the exception without ever reading them. The message you see in the
          traceback is <InlineCode>e.msg</InlineCode> concatenated with a position, which
          is why the parts separate cleanly once you ask for them separately.
        </p>
        <CodeBlock>{`>>> import json
>>> try:
...     json.loads('{"a": 1,}')
... except json.JSONDecodeError as e:
...     print(repr(e.msg), e.lineno, e.colno, e.pos)
'Illegal trailing comma before end of object' 1 8 7`}</CodeBlock>
        <p>
          The three numbers are the same place described twice.{" "}
          <InlineCode>pos</InlineCode> is a zero-based offset into the whole document,{" "}
          <InlineCode>colno</InlineCode> is the one-based column, and{" "}
          <InlineCode>lineno</InlineCode> counts newlines. That is why the message reads{" "}
          <InlineCode>char 7</InlineCode> and <InlineCode>column 8</InlineCode> for the same
          character — an off-by-one that looks like a bug and is just two conventions in one
          sentence.
        </p>
        <p>
          <InlineCode>e.doc</InlineCode> holds the original document.{" "}
          <InlineCode>e.pos</InlineCode> indexes it, so{" "}
          <InlineCode>e.doc[max(0, e.pos - 20):e.pos + 20]</InlineCode> gives you the twenty
          characters on either side of the failure without printing a megabyte into your
          logs. That one line is more useful than the message itself.
        </p>
      </ContentSection>

      <ContentSection
        id="one-message-four-problems"
        title="One message, four unrelated problems"
      >
        <p>
          The most searched form of this error is the position-zero form, and the reason it
          is hard to act on is that Python reports it for four completely different
          situations. The same four inputs handed to V8 produce four different sentences,
          which shows how much information the Python message discards.
        </p>
        <div className="mt-1 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-[13px]">
            <caption className="sr-only">
              Four inputs that all report line 1 column 1 char 0 in Python, next to what V8
              says about each
            </caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-3 py-2 font-semibold">
                  What actually arrived
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  V8 says
                </th>
              </tr>
            </thead>
            <tbody>
              {POSITION_ZERO.map((row) => (
                <tr key={row.input} className="border-b border-slate-100 align-top last:border-0">
                  <td className="px-3 py-2.5">
                    <span className="block font-medium text-slate-900">{row.label}</span>
                    <code className="mt-0.5 block font-mono text-[12px] text-slate-500">
                      {row.display ?? row.input}
                    </code>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-slate-600">
                    {row.v8}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Read the V8 column and the diagnosis writes itself. An angle bracket means the
          response was a web page. A lowercase <InlineCode>c</InlineCode> means someone
          copied a statement out of source code. A single quote means the value went through{" "}
          <InlineCode>repr()</InlineCode> at some point. Nothing at all means the body was
          empty. Python&apos;s message collapses all four into{" "}
          <InlineCode>char 0</InlineCode>, so the first character is the only evidence you
          have left — print it before you touch anything else.
        </p>
        <CodeBlock>{`body = response.content
print(repr(body[:40]))   # b'' or b'<!DOCTYPE html>' or b"'{..."

# Only then parse. The first forty bytes answer the question
# that the exception message refused to.`}</CodeBlock>
      </ContentSection>

      <ContentSection
        id="the-message-that-changed"
        title="The one message that changed between releases"
      >
        <p>
          Fourteen malformed documents were run through four interpreters. Exactly one
          message moved. A trailing comma is reported as a missing property name on 3.9,
          3.10 and 3.12, and as a trailing comma on 3.13 — and the column moved from 9 to 8
          along with it.
        </p>
        <div className="mt-1 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-[13px]">
            <caption className="sr-only">
              The same trailing comma input reported by four CPython versions
            </caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-3 py-2 font-semibold">
                  CPython
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Message
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Position
                </th>
              </tr>
            </thead>
            <tbody>
              {TRAILING_COMMA_BY_VERSION.map((row) => (
                <tr
                  key={row.version}
                  className="border-b border-slate-100 align-top last:border-0"
                >
                  <td className="px-3 py-2.5 font-mono text-[12px] text-slate-900">
                    {row.version}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{row.message}</td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-slate-500">
                    {row.position}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          This matters for a practical reason. Most explanations of this error were written
          before 3.13 and quote the old sentence, so someone on 3.13 who searches for{" "}
          <InlineCode>Illegal trailing comma before end of object</InlineCode> finds
          nothing that matches their traceback, while everyone else finds pages describing a
          message their interpreter no longer produces. Both readers end up at{" "}
          <Link
            href="/guides/json5-trailing-commas-and-comments"
            className="text-blue-700 underline underline-offset-2"
          >
            the trailing comma guide
          </Link>{" "}
          eventually, but only after concluding that their version is broken.
        </p>
        <p>
          The other thirteen inputs returned identical messages on all four versions, which
          is worth knowing too: the instability is narrow and recent, not a general property
          of the module.
        </p>
      </ContentSection>

      <ContentSection id="every-message" title="Every message, measured">
        <p>
          The table below is the whole set, produced by running each input through{" "}
          {PYTHON_VERSIONS[PYTHON_VERSIONS.length - 1]} rather than by quoting
          documentation. The V8 column is there because the contrast is the fastest way to
          work out which of the two parsers is complaining about what.
        </p>
        <div className="mt-1 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-[13px]">
            <caption className="sr-only">
              Fourteen malformed inputs and the exact message each parser returns
            </caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-3 py-2 font-semibold">
                  Input
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Python
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  V8
                </th>
              </tr>
            </thead>
            <tbody>
              {DECODE_CASES.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-slate-100 align-top last:border-0"
                >
                  <td className="px-3 py-2.5">
                    <code className="block font-mono text-[12px] text-slate-900">
                      {row.display ?? row.input}
                    </code>
                    <span className="mt-0.5 block text-[12px] text-slate-500">
                      {row.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {row.message ? (
                      <>
                        <span className="block text-slate-700">{row.message}</span>
                        <span className="mt-0.5 block font-mono text-[12px] text-slate-400">
                          {row.position}
                        </span>
                      </>
                    ) : (
                      <span className="text-emerald-700">No error, parsed</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-slate-500">
                    {row.v8}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          One row deserves a second look: <InlineCode>NaN</InlineCode> is not rejected.
          Python parses it and hands back{" "}
          <InlineCode>float(&apos;nan&apos;)</InlineCode>, while V8 refuses the same bytes.
          If a payload survives your Python service and fails in the browser that consumes
          it, this is one of the reasons, and there is a{" "}
          <Link
            href="/guides/json-error-messages-explained"
            className="text-blue-700 underline underline-offset-2"
          >
            wider table of engine disagreements
          </Link>{" "}
          for the rest.
        </p>
      </ContentSection>

      <ContentSection
        id="bytes-or-text"
        title="Whether you read bytes or text decides the BOM"
      >
        <p>
          The single most common reason for a file that parses on one machine and not on
          another is that one code path opens it in binary mode and the other in text mode.
          The bytes are identical; the argument type is not, and Python takes a different
          branch for each.
        </p>
        <div className="mt-1 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-[13px]">
            <caption className="sr-only">
              The same data passed as bytes or as a decoded string
            </caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-3 py-2 font-semibold">
                  How it was read
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {BYTES_CASES.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-slate-100 align-top last:border-0"
                >
                  <td className="px-3 py-2.5">
                    <span className="block font-medium text-slate-900">{row.label}</span>
                    <code className="mt-0.5 block font-mono text-[12px] text-slate-500">
                      {row.value}
                    </code>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={
                        row.outcome === "accepted"
                          ? "block font-medium text-emerald-700"
                          : "block font-medium text-red-700"
                      }
                    >
                      {row.outcome}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-slate-500">
                      {row.detail}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          The third row surprises people: bytes encoded as UTF-16 parse correctly, because
          the BOM in the first two bytes tells Python which codec to use. The fourth row
          matters more than it looks. A Latin-1 byte raises{" "}
          <InlineCode>UnicodeDecodeError</InlineCode>, not{" "}
          <InlineCode>JSONDecodeError</InlineCode>, and the two share no ancestor below{" "}
          <InlineCode>Exception</InlineCode> — so the handler everyone writes will miss it.
        </p>
        <CodeBlock>{`try:
    data = json.loads(raw)
except UnicodeDecodeError:
    ...  # not JSON at all: the bytes are not UTF-8
except json.JSONDecodeError as e:
    ...  # a real syntax error, and e.pos points at it`}</CodeBlock>
      </ContentSection>

      <ContentSection id="what-it-accepts" title="What it accepts when you expected a failure">
        <p>
          Three behaviours catch people out in the other direction, because the parser is
          more permissive than the specification they read:
        </p>
        <ProseList
          items={[
            <>
              <InlineCode>NaN</InlineCode>, <InlineCode>Infinity</InlineCode> and{" "}
              <InlineCode>-Infinity</InlineCode> parse by default. The strictness switch is{" "}
              <InlineCode>parse_constant</InlineCode>, not a flag, so there is no simple
              &ldquo;strict mode&rdquo; to turn on.
            </>,
            <>
              Duplicate keys are accepted and the last one wins.{" "}
              <InlineCode>{'{"a": 1, "a": 2}'}</InlineCode> returns a dict with one key, no
              warning, no error — which silently destroys data whenever a document was built
              by concatenating two objects.
            </>,
            <>
              Text after the first document is an error only if it is not whitespace. That is
              why a trailing newline is fine and a trailing comment is{" "}
              <InlineCode>Extra data</InlineCode>.
            </>,
          ]}
        />
        <p>
          The pattern to take away is that a successful <InlineCode>json.loads</InlineCode>{" "}
          proves the bytes parsed. It does not prove the document was the one you meant —
          no parser can tell you that two members shared a name.
        </p>
      </ContentSection>

      <ContentSection id="finding-the-real-error" title="The fastest way to the real error">
        <p>
          The message describes the parser&apos;s state, so treat the position as a hint and
          the surrounding text as evidence. Four steps, in order, resolve almost every
          occurrence of this error:
        </p>
        <ProseList
          items={[
            <>
              Print the first forty bytes of the body. If the input is empty or starts with{" "}
              <InlineCode>&lt;</InlineCode>, the parse never had a chance and the bug is in
              the HTTP layer, not in the data.
            </>,
            <>
              Print the twenty characters around <InlineCode>e.pos</InlineCode> from{" "}
              <InlineCode>e.doc</InlineCode>. A single quote, a comment, or a capitalised{" "}
              <InlineCode>True</InlineCode> is visible immediately and tells you where the
              document was produced.
            </>,
            <>
              Paste it into a{" "}
              <Link
                href="/json-validator"
                className="text-blue-700 underline underline-offset-2"
              >
                validator
              </Link>{" "}
              that shows the failing offset in the text rather than only the message, so you
              can see the character and its neighbours at the same time.
            </>,
            <>
              If the document is large, compare it against a known-good sample with a{" "}
              <Link href="/json-diff" className="text-blue-700 underline underline-offset-2">
                structural diff
              </Link>{" "}
              instead of reading it. One comma is easier to find as a difference than as a
              line in a traceback.
            </>,
          ]}
        />
        <p>
          One related message is worth knowing by sight:{" "}
          <InlineCode>Unexpected end of JSON input</InlineCode> is the V8 sentence for the
          empty-body case, and it has its own{" "}
          <Link
            href="/guides/json-unexpected-end-of-json-input"
            className="text-blue-700 underline underline-offset-2"
          >
            guide covering which truncations produce it
          </Link>{" "}
          — only three of six do.
        </p>
      </ContentSection>

      <FaqSection items={FAQ} path={guide.href} />
    </GuideShell>
  );
}
