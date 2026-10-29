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

const SLUG = "how-to-compare-two-json-files";
const guide = getGuide(SLUG)!;

export const metadata = pageMetadata({
  title: guide.title,
  description: guide.description,
  path: guide.href,
});

/** Output of the comparison engine on one order payload, printed verbatim. */
const POSITIONAL = [
  { type: "changed", path: "$.status", value: '"pending" → "shipped"' },
  { type: "removed", path: "$.customer.vip", value: "false (gone)" },
  { type: "changed", path: "$.items[1].quantity", value: "2 → 3" },
  { type: "added", path: "$.items[2]", value: '{"sku":"MS-07","quantity":1}' },
  { type: "added", path: "$.shippedAt", value: '"2026-10-23T07:40:00Z"' },
];

const BY_VALUE = [
  { type: "changed", path: "$.status", value: '"pending" → "shipped"' },
  { type: "removed", path: "$.customer.vip", value: "false (gone)" },
  {
    type: "removed",
    path: "$.items[1]",
    value: '{"sku":"CBL-03","quantity":2}',
  },
  {
    type: "added",
    path: "$.items[1]",
    value: '{"sku":"CBL-03","quantity":3}',
  },
  {
    type: "added",
    path: "$.items[2]",
    value: '{"sku":"MS-07","quantity":1}',
  },
  { type: "added", path: "$.shippedAt", value: '"2026-10-23T07:40:00Z"' },
];

const ORDERS = [
  {
    order: "Line order",
    meaning: "The order of lines and indent characters in the file.",
    matters: "In a text editor only. Never in the data.",
  },
  {
    order: "Key order",
    meaning: "The sequence of members inside one object.",
    matters:
      "For signatures, ETags and any cache keyed on the exact bytes. Not for the data.",
  },
  {
    order: "Array order",
    meaning: "The sequence of elements inside one array.",
    matters: "Depends on the field — a list of tags and a list of steps differ.",
  },
];

const CHANGE_TYPES = [
  {
    type: "added",
    meaning: "A member or element exists only in the second document.",
    note: "Carries the new value.",
  },
  {
    type: "removed",
    meaning: "A member or element exists only in the first document.",
    note: "Carries the old value.",
  },
  {
    type: "changed",
    meaning: "The same path holds a different primitive, or a different kind.",
    note: "Carries both values and a short description such as number → string.",
  },
  {
    type: "reordered",
    meaning: "The same members, in a different sequence.",
    note: "Only reported when key order is treated as significant.",
  },
];

const FAQ = [
  {
    question: "Can I just run diff on the two files?",
    answer:
      "You can, and it is fine when both files were written by the same tool with the same settings. It stops being fine as soon as one side is reformatted or produced by a different language: the diff then reports every line as changed, which is true about the file and wrong about the data.",
  },
  {
    question: "Why does my diff show a change when the values look identical?",
    answer:
      "Usually a type difference rather than a value difference: 1 against \"1\", or true against \"true\". A structural diff reports those as changed and prints the kinds, because a string where a number belongs will break a consumer even though it reads the same.",
  },
  {
    question: "Does the comparison follow RFC 6902 JSON Patch?",
    answer:
      "No. JSON Patch is an instruction format for applying changes: paths plus operations such as add, remove and replace. This is a report of what differs, which is a different job. The path syntax is deliberately close so the output can be read without learning anything new.",
  },
  {
    question: "What happens when documents differ in thousands of places?",
    answer:
      "The list stops at 500 entries and says so. An unbounded list is unusable in a browser and hides the shape of the change; the first 500 rows normally show whether the difference is one field or a whole new schema.",
  },
  {
    question: "Is order-insensitive array matching expensive?",
    answer:
      "It is linear per array: each element is reduced to a canonical string with sorted keys, and matched against a pool. That is fine for documents of normal size. The cost only matters for arrays with tens of thousands of objects, where the strings themselves become the memory problem.",
  },
];

export default function Page() {
  return (
    <GuideShell guide={guide}>
      <ContentSection id="why-text-diff-fails" title="Why a text diff fails on JSON">
        <p>
          A text diff compares lines. JSON gives you at least three ways to change every line
          without changing a single value: press Format, and every line changes; pass the
          file through a language whose maps iterate differently, and every key sequence
          changes; parse and re-print the document, and <InlineCode>1.0</InlineCode> becomes{" "}
          <InlineCode>1</InlineCode>.
        </p>
        <p>
          The result is the worst kind of report: hundreds of changes, none of them real. The
          opposite failure is worse still — a change that is real and invisible, which the
          last section of this guide covers.
        </p>
        <p>
          A structural comparison reads both documents into values first, then compares
          values. Formatting is gone by then, because it was never part of the value.
        </p>
      </ContentSection>

      <ContentSection id="three-orders" title="Three kinds of order, only one of them obvious">
        <p>
          Every JSON comparison has to answer the same question before it can report
          anything: which orders count as differences?
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-[13px]">
            <caption className="sr-only">Three kinds of order in a JSON document</caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-3 py-2 font-semibold">
                  Order
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  What it is
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  When it matters
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {ORDERS.map((row) => (
                <tr key={row.order}>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-800">{row.order}</td>
                  <td className="px-3 py-2.5 text-slate-600">{row.meaning}</td>
                  <td className="px-3 py-2.5 text-slate-600">{row.matters}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Line order is never a data question, so no useful comparison considers it. Key
          order is almost never a data question — but it is a byte question, and signatures
          live on bytes. Array order is the one that has no default answer, because only you
          know whether <InlineCode>{'["a", "b"]'}</InlineCode> and{" "}
          <InlineCode>{'["b", "a"]'}</InlineCode> mean the same thing.
        </p>
      </ContentSection>

      <ContentSection id="what-a-diff-should-report" title="What a useful report looks like">
        <p>
          The useful unit is not a rendered tree of both documents side by side — that is a
          reading tool. The useful unit is one row per change, with a path and a type, so the
          result can be counted, pasted into a ticket or asserted on in a test.
        </p>
        <ProseList
          items={CHANGE_TYPES.map((row) => (
            <>
              <strong className="font-medium text-slate-900">{row.type}</strong> — {row.meaning}{" "}
              <span className="text-slate-500">{row.note}</span>
            </>
          ))}
        />
        <p>
          Here is real output for one order payload that changed while it was being shipped.
          Both documents are the ones on the{" "}
          <Link href="/json-diff" className="text-blue-700 underline underline-offset-2">
            JSON Diff page
          </Link>
          , in the default mode:
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-[13px]">
            <caption className="sr-only">Five changes reported between two order payloads</caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-3 py-2 font-semibold">
                  Type
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Path
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {POSITIONAL.map((row) => (
                <tr key={`${row.type}-${row.path}`}>
                  <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px] text-slate-700">
                    {row.type}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px] break-words text-slate-800">
                    {row.path}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] break-words text-slate-600">
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Five rows, five changes, and the shape of the change is visible without opening
          either document: a status moved, a flag was dropped, a quantity was edited, an item
          and a timestamp were added.
        </p>
      </ContentSection>

      <ContentSection id="paths" title="Reading the paths">
        <p>
          Paths use JSONPath&apos;s notation because it is already familiar from{" "}
          <InlineCode>jq</InlineCode> and from API tooling. Four forms cover everything:
        </p>
        <CodeBlock>{`$                       the document root
$.status                a member whose name is an identifier
$.items[1].quantity     the second element of an array, then a member
$["odd key"]            a member whose name is not an identifier`}</CodeBlock>
        <p>
          The bracket form matters more than it looks. Keys with spaces, dots or emoji are
          legal JSON, and <InlineCode>$.odd key</InlineCode> would be ambiguous — so any key
          that is not a plain identifier is quoted, exactly as a JavaScript accessor would
          be.
        </p>
      </ContentSection>

      <ContentSection id="array-order" title="Array order is a decision you have to make">
        <p>
          Compare the same two documents again, this time matching array elements by value
          instead of by position. The total goes from five rows to six, and the interesting
          part is which row changed shape:
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-[13px]">
            <caption className="sr-only">
              The same comparison with array order ignored
            </caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-3 py-2 font-semibold">
                  Type
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Path
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {BY_VALUE.map((row) => (
                <tr key={`${row.type}-${row.path}-${row.value}`}>
                  <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px] text-slate-700">
                    {row.type}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px] break-words text-slate-800">
                    {row.path}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] break-words text-slate-600">
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          The quantity edit at <InlineCode>$.items[1]</InlineCode> turned into one removal
          and one addition. That is not a bug — it is the honest consequence of the mode. If
          elements are matched by value, a pair that matched is identical by construction, so
          no matched pair can ever be reported as changed. An edited element is, by
          definition, an element that no longer has a match.
        </p>
        <p>
          Use positional comparison when the array is a sequence (steps, messages, the lines
          of a stack trace). Use value matching when it is a set (tags, permissions, the
          members of a team). Applying the wrong one produces the two classic complaints:
          &ldquo;it says everything moved&rdquo; and &ldquo;it says nothing changed&rdquo;.
        </p>
      </ContentSection>

      <ContentSection id="what-parsing-cannot-see" title="The difference parsing cannot see">
        <p>
          A comparison of parsed values inherits every property of the parse — including the
          one nobody wants. These two documents differ by one:
        </p>
        <CodeBlock>{`{"id": 9007199254740993}
{"id": 9007199254740992}`}</CodeBlock>
        <p>
          Parsed and compared, the result is <strong className="font-medium text-slate-900">zero
          changes</strong>. Both numbers are read as the same IEEE-754 double, because 2^53
          is the largest integer a double can hold exactly, and 9007199254740993 is one past
          it. Printed back, both become <InlineCode>9007199254740992</InlineCode>.
        </p>
        <p>
          So on any document with 64-bit IDs — snowflake IDs, Twitter-style IDs, database
          bigints serialised as numbers — a structural diff can report &ldquo;no
          differences&rdquo; on two files that a text diff correctly separates. Neither tool
          is lying; they are looking at different representations, and the parsed one has
          already lost the bit.
        </p>
        <p>
          The fix is not in the diff. Serialise identifiers as strings, which is what most
          APIs do for exactly this reason, and keep them as strings through every layer that
          might parse them.{" "}
          <Link
            href="/guides/why-json-numbers-lose-precision"
            className="text-blue-700 underline underline-offset-2"
          >
            The precision guide
          </Link>{" "}
          has the full round-trip table.
        </p>
      </ContentSection>

      <ContentSection id="workflow" title="Where this fits in a workflow">
        <ProseList
          items={[
            <>
              <strong className="font-medium text-slate-900">Contract changes.</strong> Compare
              a recorded response before and after a deploy. Twelve rows is a reviewable
              change; four hundred is a rewrite, and the count alone tells you which.
            </>,
            <>
              <strong className="font-medium text-slate-900">Golden files in tests.</strong>{" "}
              Store the fixture sorted and indented so a text diff stays readable, then use a
              structural comparison for the assertion — otherwise a harmless reorder fails the
              suite.
            </>,
            <>
              <strong className="font-medium text-slate-900">Staging against production.</strong>{" "}
              With array order ignored, the remaining rows are usually environment differences
              rather than code differences: timestamps, hostnames, feature flags.
            </>,
            <>
              <strong className="font-medium text-slate-900">Signature debugging.</strong> Turn
              key order back on. If the only rows are <InlineCode>reordered</InlineCode>, the
              data never changed and the signature did — which is a canonicalisation bug, not a
              payload bug.
            </>,
          ]}
        />
        <p>
          The comparison itself runs in the browser tab, which matters for the one case where
          you cannot upload the file: comparing two production payloads that contain real
          customer data.
        </p>
      </ContentSection>

      <FaqSection items={FAQ} path={guide.href} />
    </GuideShell>
  );
}
