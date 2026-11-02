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
import { CROSS_ENGINE_VERSIONS, TRUNCATION_CASES } from "@/lib/json-references";

const SLUG = "json-unexpected-end-of-json-input";
const guide = getGuide(SLUG)!;

export const metadata = pageMetadata({
  title: guide.title,
  description: guide.description,
  path: guide.href,
});

/**
 * Places where V8 and the other parsers disagree about the same input, taken
 * from the table below rather than written from memory.
 */
const DISAGREEMENTS = [
  {
    input: "   ",
    point: "Position",
    detail:
      "V8 reports no position at all. Python counts to column 4 and MySQL to position 3 — both pointing past the whitespace, at the place the value should have been.",
  },
  {
    input: '"abc',
    point: "Direction",
    detail:
      "V8 and MySQL point at the end of the input (position 4). Python points at the start of the string (column 1). One tells you where it stopped, the other where it began.",
  },
  {
    input: '{"a":',
    point: "Vocabulary",
    detail:
      "V8 says the input ended. MySQL says “Invalid value.” Python says it was expecting a value, which is the same thing but names the missing part instead of the absence.",
  },
];

const FAQ = [
  {
    question: "What causes “Unexpected end of JSON input”?",
    answer:
      "The parser reached the end of the string while it still expected a value. In practice that is almost always an empty response body — a 204, a proxy that dropped the payload, or a fetch call whose body was never read — rather than a JSON document that was cut off mid-way.",
  },
  {
    question: "Does this message mean my JSON was truncated?",
    answer:
      "Not necessarily, and usually not. Three other kinds of truncation produce completely different messages: cutting a document after the opening brace reports a missing property name, cutting inside an array reports a missing comma or bracket, and cutting inside a string reports an unterminated string. Only an input that ends where a value was required produces this exact wording.",
  },
  {
    question: "Why does the same input give a different message in Python?",
    answer:
      "Each parser reports its own internal state, not a shared diagnosis. For a whitespace-only input, Python names the column after the whitespace while V8 names nothing at all. For an unterminated string, V8 points at the end of the input and Python points at the start of the string.",
  },
  {
    question: "How do I see what the server actually sent?",
    answer:
      "Read the response as text before parsing it, and log its length and first bytes. A body of length zero explains this message immediately; a body starting with an angle bracket is an HTML page; a body starting with a byte-order mark will fail for a different reason again.",
  },
  {
    question: "Why does this error appear when the response looks fine in DevTools?",
    answer:
      "The usual reason is that the body was consumed twice. Calling response.json() and then trying to read the body again yields nothing, and the second parse receives an empty string. Clone the response before inspecting it.",
  },
];

export default function Page() {
  return (
    <GuideShell guide={guide}>
      <ContentSection id="what-the-message-says" title="What the message actually says">
        <p>
          The wording is precise and almost everybody reads it wrong. It does not say
          &ldquo;your JSON is incomplete&rdquo;. It says the parser reached the end of the
          input while it was still expecting a value — which is a statement about the
          parser&apos;s state at the moment it gave up, not about the document.
        </p>
        <p>
          A JSON parser moves through a small number of states: expecting a value,
          expecting a property name, expecting a separator, inside a string. When the input
          runs out, the message you get depends entirely on which state it was in. That is
          why the same damage — bytes missing from the end — produces four different
          sentences, and why this particular one is so often a red herring.
        </p>
        <p>
          Everything below was produced by running the inputs through three parsers on this
          machine: {CROSS_ENGINE_VERSIONS.node}, {CROSS_ENGINE_VERSIONS.python} and{" "}
          {CROSS_ENGINE_VERSIONS.mysql}. The messages are copied character for character,
          not paraphrased.
        </p>
      </ContentSection>

      <ContentSection id="six-truncations" title="Six truncations, three engines">
        <p>
          Every row is a document that was cut short. If the message were a diagnosis, all
          six would say the same thing. They do not: only the first three produce the
          sentence you searched for.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-[13px]">
            <caption className="sr-only">
              The same six truncated inputs run through V8, Python and MySQL
            </caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-3 py-2 font-semibold">
                  Input
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  V8
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Python
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  MySQL
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {TRUNCATION_CASES.map((row) => (
                <tr key={row.input}>
                  <td className="px-3 py-2.5">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-800">
                      {row.input === "" ? "(empty)" : row.input}
                    </code>
                    <div className="mt-1 text-[11px] text-slate-500">{row.scenario}</div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-slate-800">
                    {row.node}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-slate-600">
                    {row.python}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-slate-600">
                    {row.mysql}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Read the V8 column again. The first three rows are the message you came for. Rows
          four, five and six are equally truncated — a brace with nothing after it, an array
          with no closing bracket, a quote with no closing quote — and none of them produces
          it. If you are hunting for missing bytes at the end of a document, this message is
          weak evidence.
        </p>
      </ContentSection>

      <ContentSection id="why-three-of-six" title="Why only the first three">
        <p>
          The dividing line is not how much input is missing. It is whether the parser still
          wanted a value.
        </p>
        <ProseList
          items={[
            <>
              An empty input never read a token, so the very first thing it wanted was a
              value. End of input, expecting a value.
            </>,
            <>
              Whitespace is discarded before parsing, so a string of spaces is the same
              situation as an empty one. This is worth knowing because a trailing newline
              from a text editor looks harmless and behaves identically.
            </>,
            <>
              <InlineCode>{`{"a":`}</InlineCode> read a property name and a colon, so the
              next thing required is a value. End of input, expecting a value.
            </>,
            <>
              <InlineCode>{`{`}</InlineCode> is different: after an opening brace the parser
              wants a property name or a closing brace, not a value. Different state,
              different sentence.
            </>,
            <>
              <InlineCode>{`[1,2`}</InlineCode> already has a complete element, so what is
              required next is a comma or a closing bracket.
            </>,
            <>
              <InlineCode>{`"abc`}</InlineCode> is inside a string literal, which has its own
              dedicated message in both V8 and MySQL.
            </>,
          ]}
        />
        <p>
          So the rule of thumb is narrow but reliable: this message means the input stopped
          at a point where a value was due. If a value was not due, truncation announces
          itself with a different message, and you should stop looking for the wrong thing.
        </p>
      </ContentSection>

      <ContentSection id="the-usual-cause" title="The usual cause is not truncation at all">
        <p>
          Because the message fires when a value is due and never arrived, the most common
          real-world trigger is a response body of length zero rather than a half-written
          document. Four situations account for most reports:
        </p>
        <ProseList
          items={[
            <>
              A <InlineCode>204 No Content</InlineCode> answer, or any endpoint that returns
              a success status with an empty body. Networking libraries hand you an empty
              string, and parsing it fails exactly here.
            </>,
            <>
              A proxy, gateway or CDN that returned its own response and dropped the
              payload. The request may even be logged as successful on both ends.
            </>,
            <>
              A body that was already consumed. Calling{" "}
              <InlineCode>response.json()</InlineCode> and then reading the response again
              yields nothing the second time, and the second parse sees an empty string.
            </>,
            <>
              A JSON document assembled by string concatenation where a variable was still
              undefined, leaving a hole at the point a value should have been.
            </>,
          ]}
        />
        <p>
          None of these is a syntax error in your data. In every case the parser is
          correctly reporting that it was handed nothing when it was promised something.
        </p>
      </ContentSection>

      <ContentSection id="engines-disagree" title="Where the three engines disagree">
        <p>
          The table above is worth reading for a second reason: the columns do not merely use
          different words, they point in different directions. Three cases make that concrete.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-[13px]">
            <caption className="sr-only">
              Inputs where the three parsers disagree about more than wording
            </caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-3 py-2 font-semibold">
                  Input
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  What differs
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Detail
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {DISAGREEMENTS.map((row) => (
                <tr key={row.input}>
                  <td className="px-3 py-2.5">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-800">
                      {row.input}
                    </code>
                  </td>
                  <td className="px-3 py-2.5 text-slate-800">{row.point}</td>
                  <td className="px-3 py-2.5 text-slate-600">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          The practical consequence: any code that pattern-matches on error text to decide
          what went wrong is only valid for one parser. A regular expression tuned to V8
          will not fire on Python, and the unterminated-string case will point at the wrong
          end of the document even when it does.
        </p>
      </ContentSection>

      <ContentSection id="how-to-tell" title="How to find out what actually arrived">
        <p>
          Read the body as text before parsing it. Length and first bytes answer the
          question in one step, and they answer it for every one of the six cases above.
        </p>
        <CodeBlock>{`const res = await fetch(url);

// Read text first. Cloning is only needed if something else also reads the body.
const text = await res.text();
console.log(res.status, text.length, JSON.stringify(text.slice(0, 40)));

if (text.length === 0) {
  throw new Error("Empty body - not a JSON problem");
}

// A byte-order mark survives text() and breaks JSON.parse one character later.
const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

try {
  return JSON.parse(body);
} catch (error) {
  throw new Error(\`Body starts with \${JSON.stringify(body.slice(0, 20))}\`, {
    cause: error,
  });
}`}</CodeBlock>
        <p>
          Three lines of logging distinguish every case in the first table. A length of zero
          is the empty-body case. A length that matches what DevTools shows but a first
          character of <InlineCode>{`<`}</InlineCode> is an HTML fallback. A first character
          of <InlineCode>{`\\uFEFF`}</InlineCode> is a byte-order mark, which produces a
          different message entirely.
        </p>
      </ContentSection>

      <ContentSection id="fix" title="The fix that holds">
        <p>
          There are two separate fixes because there are two separate problems, and applying
          the wrong one is why this error keeps coming back.
        </p>
        <ProseList
          items={[
            <>
              <strong>If the body is empty</strong>, the fix is on the sending side: return
              a status that says so, or send{" "}
              <InlineCode>{`"null"`}</InlineCode> explicitly. A client cannot distinguish
              &ldquo;no data&rdquo; from &ldquo;failed silently&rdquo; when both arrive as
              zero bytes.
            </>,
            <>
              <strong>If the body was consumed</strong>, clone before inspecting. Reading a
              response body is a one-shot operation, and a debugging line added in the wrong
              place will empty it for the code that follows.
            </>,
            <>
              <strong>If the document really was cut off</strong>, expect a different
              message. Handle every parser error by its shape rather than its wording:
              whether a position is reported, whether the input was quoted back, and whether
              the failure happened at the first character or later.
            </>,
          ]}
        />
        <p>
          One habit prevents most of this class of bug: validate before you parse, using the
          same input the parser will see. Paste the body into a{" "}
          <Link
            href="/json-validator"
            className="text-blue-700 underline underline-offset-2"
          >
            JSON validator
          </Link>{" "}
          and the difference between an empty body, an HTML page and a truncated document
          becomes visible immediately, without a round trip through your application logs.
        </p>
      </ContentSection>

      <ContentSection id="next" title="Related reading">
        <p>
          If the first character is an angle bracket rather than nothing, the input was not
          truncated — it was a different document.{" "}
          <Link
            href="/guides/json-unexpected-token-at-position-0"
            className="text-blue-700 underline underline-offset-2"
          >
            The position 0 guide
          </Link>{" "}
          covers the SPA fallback, the 404 page and the byte-order mark that produce it, and{" "}
          <Link
            href="/guides/json-error-messages-explained"
            className="text-blue-700 underline underline-offset-2"
          >
            the guide to parser messages
          </Link>{" "}
          covers the messages that arrive with a position attached. If the failure only
          appears after a round trip through a database column,{" "}
          <Link
            href="/guides/json5-trailing-commas-and-comments"
            className="text-blue-700 underline underline-offset-2"
          >
            the JSON5 guide
          </Link>{" "}
          explains the comma and comment complaints.
        </p>
      </ContentSection>

      <FaqSection items={FAQ} path={guide.href} />
    </GuideShell>
  );
}
