import Link from "next/link";
import { AdSlot } from "@/components/ad-slot";
import { ContentSection, ProseList, StepList } from "@/components/content-section";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { RelatedTools } from "@/components/related-tools";
import { ToolPageHeader } from "@/components/tool-page-header";
import { JsonMinifierTool } from "@/components/tools/json-minifier-tool";
import { pageMetadata } from "@/lib/metadata";
import { absoluteUrl } from "@/lib/site";

const PATH = "/json-minifier";

export const metadata = pageMetadata({
  title: "JSON Minifier",
  description:
    "Minify JSON by removing unnecessary whitespace. Compare character and byte counts before and after, then copy or download the compact result.",
  path: PATH,
});

const FAQ = [
  {
    question: "What exactly gets removed?",
    answer:
      "Whitespace between tokens: spaces, tabs and line breaks that sit outside string values. Nothing inside a string is touched, so an address such as \"1 Main St, Suite 4\" keeps its spaces, and escaped characters like \\n stay escaped.",
  },
  {
    question: "Can minifying change my data?",
    answer:
      "The structure and values are preserved, but re-serialization normalises number formatting: 1.0 becomes 1, 1e3 becomes 1000, and -0 becomes 0. If a document repeats a key inside the same object, only the last occurrence survives, because that is how JSON parsers resolve duplicates. Integers beyond 2^53 can lose precision when parsed as JavaScript numbers.",
  },
  {
    question: "How much smaller will my document get?",
    answer:
      "It depends entirely on how much indentation and line breaking the input has. A pretty-printed file with four-space indents and one value per line typically shrinks a lot; a document that is already minified will not shrink at all, and this tool reports that instead of pretending otherwise.",
  },
  {
    question: "Does minifying replace gzip or Brotli?",
    answer:
      "No, and it is worth being precise about the difference. HTTP compression already removes repeated whitespace on the wire, so the transfer-size gain from minifying is usually much smaller than the raw byte difference suggests. Minification still helps where compression is not applied — embedded JSON in a build artefact, values stored in a database, or payloads passed to a system that measures the raw body.",
  },
  {
    question: "Can I get the indentation back?",
    answer:
      "Yes. The whitespace itself is gone, but the data is intact, so pasting the minified output into the JSON formatter reproduces a readable document. You will not get the original layout back, only an equivalent one.",
  },
  {
    question: "Is there a size limit?",
    answer:
      "Up to 2,000,000 characters, processed in the tab. Very large documents are limited by the memory available to your browser rather than by a server quota, since there is no server involved.",
  },
  {
    question: "Is the JSON uploaded while minifying?",
    answer:
      "No. The text is parsed and re-serialized locally with the browser's own JSON functions. No request is made, and nothing is written to storage or analytics.",
  },
];

export default function JsonMinifierPage() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ToolPageHeader
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Tools", href: "/#tools" },
            { label: "JSON Minifier" },
          ]}
          title="JSON Minifier"
          description="Remove every optional byte from a JSON document. The output is checked by the same parser that validates the input, and the before/after counts show exactly what was saved."
        />

        <div className="mt-6">
          <JsonMinifierTool />
        </div>

        <AdSlot slot="toolBelow" />

        <div className="mt-12 space-y-10">
          <ContentSection id="how-to" title="How to minify JSON">
            <StepList
              steps={[
                {
                  title: "Paste an indented document",
                  body: "into the left panel, or press “Load example” for a verbose sample with nested objects.",
                },
                {
                  title: "Press Minify JSON",
                  body: "The document is parsed first, so invalid input fails loudly instead of producing a broken result.",
                },
                {
                  title: "Read the comparison",
                  body: "above the status line: characters before and after, characters saved, and the reduction percentage.",
                },
                {
                  title: "Copy or download",
                  body: "the compact output. The downloaded file is UTF-8 encoded JSON with a timestamped name.",
                },
              ]}
            />
          </ContentSection>

          <ContentSection id="what-is-removed" title="What minification actually removes">
            <p>
              JSON uses whitespace only as a separator between tokens. Everything else — the
              quotes around a key, the colon after it, the comma between members — is
              structural and has to stay. So a minifier removes:
            </p>
            <ProseList
              items={[
                "Indentation at the start of every line",
                "Line breaks between members and array items",
                "Spaces around colons and commas",
                "Trailing newlines at the end of the document",
              ]}
            />
            <p>
              It does not remove or reorder anything inside a string, and it does not touch
              the keys themselves. Minified JSON is not compressed JSON — it is the same
              document with the formatting taken out.
            </p>
          </ContentSection>

          <ContentSection id="when-to-minify" title="When it is worth doing">
            <ProseList
              items={[
                <>
                  <strong className="font-medium text-slate-900">Request and response bodies</strong>{" "}
                  that are measured in raw bytes, for example payloads stored in a database
                  column or embedded in a log line.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Bundled fixtures</strong>{" "}
                  used by tests, where readability is provided by the formatter on demand
                  rather than by the file itself.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Inline JSON</strong> inside
                  an HTML attribute or a script tag, where line breaks and indentation add
                  bytes to every page view.
                </>,
              ]}
            />
            <p>
              Minifying is usually the wrong choice for anything a human reviews: config
              files in a repository, example payloads in documentation, and anything that
              appears in a code review. A single-line diff of a minified file tells you
              nothing about what changed.
            </p>
          </ContentSection>

          <ContentSection id="bytes-vs-chars" title="Characters, bytes and what the numbers mean">
            <p>
              Character counts are taken from the text exactly as it appears in the editor.
              Byte counts are the UTF-8 encoded size, which is what a file on disk or a
              network response would contain. The two differ as soon as a document contains
              non-ASCII text: an accented letter or a CJK character takes two or three bytes
              even though it counts as one character.
            </p>
            <p>
              That is why the summary reports both. A document full of non-ASCII strings can
              have a modest character reduction and a larger absolute byte reduction — or the
              other way round, if the indentation was mostly single spaces.
            </p>
            <p>
              To go the other way, use the{" "}
              <Link href="/json-formatter" className="text-blue-700 underline underline-offset-2">
                JSON formatter
              </Link>{" "}
              to pretty-print the result again, or the{" "}
              <Link href="/json-validator" className="text-blue-700 underline underline-offset-2">
                validator
              </Link>{" "}
              if you only want to know whether a document parses.
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
          name: "JSON Minifier",
          url: absoluteUrl(PATH),
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript",
          description:
            "Minify JSON in the browser and compare character and byte counts before and after.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          isAccessibleForFree: true,
        }}
      />
    </>
  );
}
