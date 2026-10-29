import Link from "next/link";
import { AdSlot } from "@/components/ad-slot";
import { ContentSection, ProseList } from "@/components/content-section";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { RelatedTools } from "@/components/related-tools";
import { ToolPageHeader } from "@/components/tool-page-header";
import { JsonDiffTool } from "@/components/tools/json-diff-tool";
import { pageMetadata } from "@/lib/metadata";
import { MAX_DIFF_ENTRIES } from "@/lib/json-diff";
import { MAX_INPUT_CHARS, formatCount } from "@/lib/json-utils";
import { absoluteUrl } from "@/lib/site";

const PATH = "/json-diff";

export const metadata = pageMetadata({
  title: "JSON Diff Checker",
  description:
    "Compare two JSON documents and see every added, removed and changed value with its exact path. Runs in your browser, with optional key and array order matching.",
  path: PATH,
});

const FAQ = [
  {
    question: "Does this produce a JSON Patch (RFC 6902)?",
    answer:
      "No. The output is a list of changes with paths, meant to be read. Generating a patch is a different problem — it requires choosing between add, remove, replace, move and copy for each change, and the result is only useful if the consumer can apply it. The change list here is deliberately the human-readable version.",
  },
  {
    question: "What does “ignore array order” actually match on?",
    answer:
      "Elements are matched by value: two items pair up when their members are equal regardless of key order. A matched pair is therefore identical, so an edited element cannot appear as “changed” — it shows up as one removed plus one added. That is the honest representation: under order-insensitive matching, a moved value and an edited value are the same observation.",
  },
  {
    question: "Why is a reordered key only reported when I turn the option off?",
    answer:
      "Because for most work, member order is noise — two objects with the same members are the same data. Turn “ignore key order” off when order is part of the contract: signature verification, ETags, or a cache keyed on the serialised bytes. JSON itself defines no order, so anything depending on it is depending on the producer.",
  },
  {
    question: "Are numbers compared as text or as numbers?",
    answer:
      "As numbers, after parsing. That means 1 and 1.0 compare equal, and -0 equals 0 — which matches how JSON prints them. It also means both documents went through a float round trip before comparison, so IDs above 2^53 may already be equal for the wrong reason.",
  },
  {
    question: "How large can the two documents be?",
    answer: `Each side is limited to ${formatCount(MAX_INPUT_CHARS)} characters. The comparison stops after ${formatCount(MAX_DIFF_ENTRIES)} differences and says so, because a list of ten thousand rows is not a report — narrow the documents down and compare a subtree instead.`,
  },
];

export default function JsonDiffPage() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ToolPageHeader
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Tools", href: "/#tools" },
            { label: "JSON Diff Checker" },
          ]}
          title="JSON Diff Checker"
          description="Compare two documents and get a flat list of every difference with the path to it. Change one value, add a member, drop an array element — each shows up as its own row, so nothing hides inside a collapsed tree."
        />

        <div className="mt-6">
          <JsonDiffTool />
        </div>

        <AdSlot slot="toolBelow" />

        <div className="mt-12 space-y-10">
          <ContentSection id="how-to" title="How to compare two documents">
            <ProseList
              items={[
                <>
                  Paste the original document on the left and the updated one on the right.
                  Either side can be a minified or an indented payload; formatting makes no
                  difference to the result.
                </>,
                <>
                  Press{" "}
                  <strong className="font-medium text-slate-900">Compare JSON</strong>. Each
                  difference is listed with a path such as{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">
                    $.items[1].quantity
                  </code>
                  .
                </>,
                <>
                  Use{" "}
                  <strong className="font-medium text-slate-900">Ignore array order</strong>{" "}
                  when the same values arrive in a different sequence and the sequence is not
                  meaningful — a list of tags, for example.
                </>,
                <>
                  Turn{" "}
                  <strong className="font-medium text-slate-900">Ignore key order</strong> off
                  when member order is part of the contract, such as a payload you sign or
                  hash.
                </>,
              ]}
            />
          </ContentSection>

          <ContentSection id="what-counts" title="What counts as a difference">
            <p>
              A value is compared after parsing, not as text. That single decision explains
              most of the behaviour:
            </p>
            <ProseList
              items={[
                <>
                  <strong className="font-medium text-slate-900">Whitespace never counts.</strong>{" "}
                  Indentation, line breaks and spacing cannot produce a difference.
                </>,
                <>
                  <strong className="font-medium text-slate-900">
                    Numbers compare numerically.
                  </strong>{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">1</code> equals{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">1.0</code>, and{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">1e3</code>{" "}
                  equals{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">1000</code>.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Types are respected.</strong>{" "}
                  The string{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">&quot;42&quot;</code>{" "}
                  is reported as a change against the number{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">42</code>, with
                  the type transition shown in the row.
                </>,
                <>
                  <strong className="font-medium text-slate-900">
                    A missing member differs from null.
                  </strong>{" "}
                  Removing a key and setting it to{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">null</code> are
                  different states, and the list says which one happened.
                </>,
                <>
                  <strong className="font-medium text-slate-900">
                    Array positions are compared by index by default.
                  </strong>{" "}
                  Inserting an element at the front of a ten-item array reports ten changes,
                  because every position shifted. Turn on “ignore array order” if that is not
                  what you mean.
                </>,
              ]}
            />
          </ContentSection>

          <ContentSection id="paths" title="How to read a path">
            <p>
              Paths start at{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">$</code>, the whole
              document. Members are joined with a dot when the key is a plain identifier, and
              with brackets and quotes otherwise —{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">
                $[&quot;content-type&quot;]
              </code>{" "}
              rather than{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">
                $.content-type
              </code>
              , which would be ambiguous. Array elements always use an index:{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">
                $.orders[2].items[0].sku
              </code>
              .
            </p>
            <p>
              The paths are a report format, not a query language, so they are copy-pasteable
              into a bug ticket and readable without tooling. They are close enough to JSONPath
              that most of the time you can paste one into a debugger and it resolves, but no
              evaluator is bundled here.
            </p>
          </ContentSection>

          <ContentSection id="order-matters" title="When key order really matters">
            <p>
              JSON defines an object as an unordered collection of members, so a producer that
              reorders keys has not changed the document. Two consumers then disagree about
              that: code that compares data sees no change, and code that hashes bytes sees a
              different hash for identical data.
            </p>
            <p>
              The second group is where signature verification, ETags and content-addressed
              storage live. If you are debugging a signature that stopped matching after a
              refactor, turn “ignore key order” off: an order-only difference is exactly the
              failure that does not show up in a normal comparison. The{" "}
              <Link
                href="/guides/why-json-numbers-lose-precision"
                className="text-blue-700 underline underline-offset-2"
              >
                number precision guide
              </Link>{" "}
              covers the other half of the same problem, where a round trip silently rewrites
              the bytes.
            </p>
            <p>
              For the longer version — the three kinds of order, why an edited array element
              becomes a removal plus an addition, and the one difference a parsed comparison
              cannot see — read{" "}
              <Link
                href="/guides/how-to-compare-two-json-files"
                className="text-blue-700 underline underline-offset-2"
              >
                How to compare two JSON files
              </Link>
              .
            </p>
          </ContentSection>

          <ContentSection id="limits" title="What this page does not do">
            <ProseList
              items={[
                <>
                  <strong className="font-medium text-slate-900">No JSON Patch output.</strong>{" "}
                  The result is a change list for a human, not an RFC 6902 document.
                </>,
                <>
                  <strong className="font-medium text-slate-900">No schema validation.</strong>{" "}
                  Both sides have to be syntactically valid JSON; whether they match your schema
                  is a separate question.
                </>,
                <>
                  <strong className="font-medium text-slate-900">
                    No three-way merge.
                  </strong>{" "}
                  Two documents, not base/ours/theirs. Merging is a different tool.
                </>,
                <>
                  <strong className="font-medium text-slate-900">
                    No side-by-side text alignment.
                  </strong>{" "}
                  The list is structural. For a character-level diff of formatted output, a text
                  diff tool is the right instrument.
                </>,
              ]}
            />
          </ContentSection>

          <ContentSection id="privacy" title="Where your data goes">
            <p>
              Both documents are parsed and compared in this tab. Nothing is uploaded, nothing
              is written to a cookie or to localStorage, and no analytics event carries the
              content — only the fact that a page was viewed, handled by the site-wide tag. If
              you open the network panel you will see no request containing your JSON.
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
          name: "JSON Diff Checker",
          url: absoluteUrl(PATH),
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript",
          description:
            "Compare two JSON documents in the browser and list every added, removed and changed value with its path.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          isAccessibleForFree: true,
        }}
      />
    </>
  );
}
