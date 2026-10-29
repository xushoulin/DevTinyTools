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

const SLUG = "json5-trailing-commas-and-comments";
const guide = getGuide(SLUG)!;

export const metadata = pageMetadata({
  title: guide.title,
  description: guide.description,
  path: guide.href,
});

/** Verbatim V8 messages, captured with Node 22.22.2. */
const SYNTAX_CASES = [
  {
    input: `{"a":1,}`,
    message: `Expected double-quoted property name in JSON at position 7 (line 1 column 8)`,
    source: "A trailing comma in an object",
  },
  {
    input: `[1,2,]`,
    message: `Unexpected token ']', "[1,2,]" is not valid JSON`,
    source: "The same comma in an array, reported without a position",
  },
  {
    input: `{"a":1 // note}`,
    message: `Expected ',' or '}' after property value in JSON at position 7 (line 1 column 8)`,
    source: "A line comment after a value",
  },
  {
    input: `{/* note */"a":1}`,
    message: `Expected property name or '}' in JSON at position 1 (line 1 column 2)`,
    source: "A block comment before the first key",
  },
  {
    input: `{'a':1}`,
    message: `Expected property name or '}' in JSON at position 1 (line 1 column 2)`,
    source: "Single-quoted key, identical message to an unquoted one",
  },
  {
    input: `{a:1}`,
    message: `Expected property name or '}' in JSON at position 1 (line 1 column 2)`,
    source: "An unquoted key",
  },
  {
    input: `{"a":0x1F}`,
    message: `Expected ',' or '}' after property value in JSON at position 6 (line 1 column 7)`,
    source: "A hexadecimal number",
  },
  {
    input: `{"a":.5}`,
    message: `Unexpected token '.', "{"a":.5}" is not valid JSON`,
    source: "A leading decimal point",
  },
  {
    input: `{"a":+1}`,
    message: `Unexpected token '+', "{"a":+1}" is not valid JSON`,
    source: "An explicit plus sign",
  },
  {
    input: `{"a":Infinity}`,
    message: `Unexpected token 'I', "{"a":Infinity}" is not valid JSON`,
    source: "A bare word where a value belongs",
  },
  {
    input: `{"a":"one\ntwo"}`,
    message: `Bad control character in string literal in JSON at position 11 (line 1 column 12)`,
    source: "A literal newline inside a string, instead of \\n",
  },
];

const DIALECTS = [
  {
    name: "JSON",
    spec: "RFC 8259",
    allows: "Nothing beyond the grammar",
    where: "APIs, package.json, most config files",
  },
  {
    name: "JSONC",
    spec: "No specification",
    allows: "Comments and trailing commas",
    where: "tsconfig.json, VS Code settings.json and launch.json",
  },
  {
    name: "JSON5",
    spec: "Its own spec, json5.org",
    allows:
      "Comments, trailing commas, unquoted keys, single quotes, hex numbers, leading and trailing decimal points, Infinity, NaN",
    where: "A few build tools, some embedded configuration",
  },
  {
    name: "NDJSON / JSON Lines",
    spec: "Its own convention",
    allows: "Nothing new — but one complete value per line",
    where: "Logs, data exports, stream processing",
  },
];

const NUMBER_RULES = [
  {
    input: "01",
    message: "Unexpected number in JSON at position 1 (line 1 column 2)",
    note: "Leading zeros are not allowed.",
  },
  {
    input: "1.",
    message: "Unterminated fractional number in JSON at position 2 (line 1 column 3)",
    note: "A decimal point needs at least one digit after it.",
  },
  {
    input: ".5",
    message: "Unexpected token '.', \".5\" is not valid JSON",
    note: "A number must start with a digit or a minus sign.",
  },
  {
    input: "+1",
    message: "Unexpected token '+', \"+1\" is not valid JSON",
    note: "A plus sign is not part of the grammar.",
  },
  {
    input: "1e",
    message: "Exponent part is missing a number in JSON at position 2 (line 1 column 3)",
    note: "The exponent marker needs digits.",
  },
  {
    input: "-",
    message: "No number after minus sign in JSON at position 1 (line 1 column 2)",
    note: "A minus sign alone is not a number.",
  },
  {
    input: "1e400",
    message: "No error — it parses to Infinity",
    note: "Valid by the grammar, unrepresentable as a double. Printed back, it becomes null.",
  },
];

const FAQ = [
  {
    question: "Why does it work in my editor but not in the build?",
    answer:
      "Because the editor is not parsing JSON. VS Code reads settings.json, launch.json and tsconfig.json with a JSONC parser that tolerates comments and trailing commas, and TypeScript has its own tolerant parser for tsconfig.json. The moment the file is read by JSON.parse or by a strict server-side loader, those two allowances become errors.",
  },
  {
    question: "Is JSON5 the same as JSONC?",
    answer:
      "No. JSONC adds comments and trailing commas and nothing else — it is the format Microsoft tooling uses. JSON5 goes further: unquoted keys, single quotes, hexadecimal numbers, leading decimal points, explicit plus signs, Infinity, NaN and multi-line strings. A file that is valid JSON5 is often not valid JSONC, and the reverse is always true.",
  },
  {
    question: "Can I strip comments with a regular expression?",
    answer:
      "Not safely. A // inside a string value is a URL, not a comment, and a /* inside a string is text. A regex cannot tell which is which without parsing. Parse the document with a JSON5-aware parser and re-serialise it, which removes comments and normalises everything else at the same time.",
  },
  {
    question: "What about a file that starts with an invisible character?",
    answer:
      "That is a byte-order mark, U+FEFF, added by some Windows editors. It is not whitespace to a JSON parser, so the message quotes what looks like an empty string. Strip the first character if it is U+FEFF before parsing; no format accepts it.",
  },
  {
    question: "Why does the trailing comma error point at the closing brace?",
    answer:
      "Because a comma promises another member. The parser reads the comma, expects a key, and finds the closing brace instead — so it reports the position of the brace, not of the comma, and also reports a comma as expected rather than as unwanted. Read one character to the left of the reported position and the mistake is usually there.",
  },
];

export default function Page() {
  return (
    <GuideShell guide={guide}>
      <ContentSection id="two-allowances" title="Two allowances, one name">
        <p>
          &ldquo;JSON with comments&rdquo; is not a relaxed version of JSON. It is a different
          format that happens to share most of the grammar, and strict parsers do not know it
          exists. The two things people add almost always are comments and a trailing comma —
          and both produce messages that describe a different problem than the one you have.
        </p>
        <p>
          A trailing comma is the clearest example. The comma itself is legal where it
          appears; what it promises is a member that never arrives. So the parser complains
          about the closing brace, one character later, and it complains in terms of what it
          expected rather than what it found.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-[13px]">
            <caption className="sr-only">
              Verbatim parser messages for JSON5 and JSONC syntax
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
                  What was added
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {SYNTAX_CASES.map((row) => (
                <tr key={row.source}>
                  <td className="px-3 py-2.5 font-mono text-[12px] whitespace-nowrap text-slate-800">
                    {row.input}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] leading-relaxed break-words text-slate-700">
                    {row.message}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          Captured on 29 October 2026 with Node 22.22.2 (V8). Firefox and Safari phrase these
          differently but stop at the same character.
        </p>
      </ContentSection>

      <ContentSection id="where-it-came-from" title="Where the file came from">
        <p>
          Almost nobody types a trailing comma into JSON on purpose. The file is usually one
          of these:
        </p>
        <ProseList
          items={[
            <>
              <strong className="font-medium text-slate-900">A configuration file.</strong>{" "}
              tsconfig.json, VS Code&apos;s settings.json, launch.json and devcontainer.json are
              all read by JSONC parsers, so every editor hint says comments are fine. They are —
              until the file is read by something else.
            </>,
            <>
              <strong className="font-medium text-slate-900">A JavaScript object.</strong> A
              literal copied out of a .js file keeps its unquoted keys, single quotes and
              trailing commas. Every one of those is legal JavaScript and none is legal JSON.
            </>,
            <>
              <strong className="font-medium text-slate-900">A printed object.</strong> Python
              prints dicts with single quotes; Ruby prints hashes with <InlineCode>=&gt;</InlineCode>.
              Neither output is JSON, whatever it looks like at a glance.
            </>,
            <>
              <strong className="font-medium text-slate-900">A hand-edited API payload.</strong>{" "}
              Adding a field by hand at the end of an object is where the comma goes in, and
              where it stays after the field is deleted again.
            </>,
            <>
              <strong className="font-medium text-slate-900">A file saved by a Windows editor.</strong>{" "}
              Beyond the comma, it may have written a byte-order mark, which produces a message
              about an invisible character at position 0.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="dialects" title="Four dialects, one of which is JSON">
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-[13px]">
            <caption className="sr-only">What each JSON dialect allows</caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-3 py-2 font-semibold">
                  Format
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Specification
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Allows beyond JSON
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Typically found in
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {DIALECTS.map((row) => (
                <tr key={row.name}>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-800">{row.name}</td>
                  <td className="px-3 py-2.5 text-slate-600">{row.spec}</td>
                  <td className="px-3 py-2.5 text-slate-600">{row.allows}</td>
                  <td className="px-3 py-2.5 text-slate-600">{row.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          The practical rule: the format is decided by the reader, not by the file extension.
          A file named <InlineCode>config.json</InlineCode> read by a JSONC parser may contain
          comments; the same bytes sent to an API will fail. That is why &ldquo;it works in my
          editor&rdquo; is not evidence.
        </p>
      </ContentSection>

      <ContentSection id="numbers" title="Numbers have rules too">
        <p>
          JSON5 accepts several number forms that JSON does not, and each one produces its own
          message. Some of the messages name the construct instead of the character, which
          makes them easier to act on:
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-[13px]">
            <caption className="sr-only">Number forms rejected by a strict JSON parser</caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-3 py-2 font-semibold">
                  Input
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Message
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Why
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {NUMBER_RULES.map((row) => (
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
        <p>
          The last row is the one worth remembering. <InlineCode>1e400</InlineCode> is
          grammatically valid JSON and it parses without complaint — to{" "}
          <InlineCode>Infinity</InlineCode>, because no double can hold it. Serialise that
          value again and it becomes <InlineCode>null</InlineCode>, silently. A number that
          passes validation can still be destroyed by the round trip, which is the subject of{" "}
          <Link
            href="/guides/why-json-numbers-lose-precision"
            className="text-blue-700 underline underline-offset-2"
          >
            the precision guide
          </Link>
          .
        </p>
      </ContentSection>

      <ContentSection id="fix" title="How to fix it without hand-editing">
        <p>
          Deleting comments by hand works for one file and fails for a build pipeline. The
          durable version is to parse with something that understands the dialect, then
          re-serialise as strict JSON:
        </p>
        <CodeBlock>{`import JSON5 from "json5";
import { writeFileSync } from "node:fs";

const source = readFileSync("tsconfig.json", "utf8");
writeFileSync("tsconfig.strict.json", JSON.stringify(JSON5.parse(source), null, 2));`}</CodeBlock>
        <p>
          For a file with only comments and trailing commas, a JSONC-aware reader such as{" "}
          <InlineCode>jsonc-parser</InlineCode> is the smaller dependency. Either way, the
          parse step is what makes it safe: it removes comments without touching the{" "}
          <InlineCode>{"//"}</InlineCode> inside <InlineCode>&quot;https://example.com&quot;</InlineCode>,
          which any regular expression will happily eat.
        </p>
        <p>
          If you only need to know <em>why</em> a file is rejected, paste it into the{" "}
          <Link href="/json-validator" className="text-blue-700 underline underline-offset-2">
            JSON Validator
          </Link>{" "}
          — it shows the reported position, the offending line and a plain-English reading of
          the message. To see what the file becomes once comments are gone, the{" "}
          <Link href="/json-formatter" className="text-blue-700 underline underline-offset-2">
            formatter
          </Link>{" "}
          re-prints it, which makes the difference visible line by line.
        </p>
      </ContentSection>

      <FaqSection items={FAQ} path={guide.href} />
    </GuideShell>
  );
}
