import { AdSlot } from "@/components/ad-slot";
import Link from "next/link";
import { ContentSection, ProseList, StepList } from "@/components/content-section";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { RelatedTools } from "@/components/related-tools";
import { LicenseDialog } from "@/components/license-dialog";
import { ToolPageHeader } from "@/components/tool-page-header";
import { JsonToCsvTool } from "@/components/tools/json-to-csv-tool";
import { pageMetadata } from "@/lib/metadata";
import {
  CSV_PRO_CHAR_LIMIT,
  PRO_PRICE_LIFETIME,
  getProCheckoutUrl,
} from "@/lib/pro";
import { absoluteUrl } from "@/lib/site";

const PATH = "/json-to-csv";

export const metadata = pageMetadata({
  title: "JSON to CSV Converter",
  description:
    "Convert a JSON array to CSV online. Nested objects become dotted columns, every value is escaped per RFC 4180, and the file downloads ready for Excel.",
  path: PATH,
});

const FAQ = [
  {
    question: "Which JSON shapes convert cleanly?",
    answer:
      "An array of objects is the natural fit: every object becomes a row, and the columns are the union of all keys across rows in first-appearance order. A single object is accepted and wrapped in a one-row table. An array of primitives becomes a one-column table named value.",
  },
  {
    question: "What happens to nested objects?",
    answer:
      "With flattening enabled (the default), each nesting level becomes a dotted column: customer.email, customer.address.city. Every row shares the same column set, so a missing path is simply an empty cell. With flattening disabled, each row serialises to a single json column containing compact JSON.",
  },
  {
    question: "Why are arrays inside rows written as JSON instead of more columns?",
    answer:
      "An array of unknown length cannot map to a fixed set of columns without inventing a convention — items.0.sku, items.1.sku, and so on — and the union across rows explodes quickly. This tool writes array values as compact JSON in one cell, which stays lossless and readable in Excel. Copy a value into the JSON formatter when you need to inspect one.",
  },
  {
    question: "Is the output valid for Excel?",
    answer:
      "Yes. Lines end with CRLF per RFC 4180, fields containing the delimiter, quotes or line breaks are quoted with doubled inner quotes, and null becomes an empty cell rather than the string null. If you open the file in a locale where Excel expects semicolons (much of Europe), switch the delimiter to semicolon before converting.",
  },
  {
    question: "What does null become?",
    answer:
      "An empty cell. Writing the four characters null into a spreadsheet column that is otherwise numeric turns the whole column into text, which breaks sorting and formulas. An empty cell keeps the column clean.",
  },
  {
    question: "How are numbers handled?",
    answer:
      "They are written as JSON prints them: 129.5 stays 129.5. The precision caveat from the JSON number guide applies — an integer above 2^53 parsed as a JavaScript number has already lost precision before conversion, so the CSV cannot restore it.",
  },
  {
    question: "Is there a size limit?",
    answer:
      `Free conversion covers up to ${new Intl.NumberFormat("en-US").format(CSV_PRO_CHAR_LIMIT)} characters per document, processed locally in the tab. Larger documents are limited by your browser's memory rather than a server quota, because there is no server involved. A Pro tier with batch conversion is planned.`,
  },
  {
    question: "Is my JSON uploaded during conversion?",
    answer:
      "No. The document is parsed and serialised locally with browser APIs, the file picker reads the file with FileReader, and no request is made. Nothing is written to storage or analytics.",
  },
];

const PRO_FEATURES = [
  "Batch conversion — drop up to 25 JSON files and download them all",
  `${new Intl.NumberFormat("en-US").format(CSV_PRO_CHAR_LIMIT)}-character documents, roughly 10 MB`,
  "Excel workbook (.xlsx) export with one sheet per file",
  "Advanced flattening: array index columns, custom path separators",
  "Priority fixes — conversion bugs move to the front of the queue",
];

export default function JsonToCsvPage() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ToolPageHeader
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Tools", href: "/#tools" },
            { label: "JSON to CSV" },
          ]}
          title="JSON to CSV Converter"
          description="Turn a JSON array into a spreadsheet-ready CSV. Nested objects flatten into dotted columns, values are escaped per RFC 4180, and the result downloads as a file your spreadsheet opens directly."
        />

        <div className="mt-6">
          <JsonToCsvTool />
        </div>

        <AdSlot slot="toolBelow" />

        <div className="mt-12 space-y-10">
          <ContentSection id="how-to" title="How to convert JSON to CSV">
            <StepList
              steps={[
                {
                  title: "Paste a JSON array",
                  body: "into the input panel, open a .json file, or press “Load example” for an orders payload with nested objects.",
                },
                {
                  title: "Choose your options",
                  body: "The delimiter (comma, semicolon or tab), whether nested objects flatten into dotted columns, and whether a header row is written.",
                },
                {
                  title: "Press Convert to CSV",
                  body: "The document is parsed first, so invalid JSON fails with the same line-and-column report as the validator instead of producing a broken file.",
                },
                {
                  title: "Check the preview, then download",
                  body: "The first rows render as plain text above the status line. Download writes a UTF-8 CSV with CRLF line endings, ready to open in Excel, Numbers or Google Sheets.",
                },
              ]}
            />
          </ContentSection>

          <ContentSection id="row-model" title="What counts as a row and a column">
            <p>
              CSV is a rectangular format: every row must have the same columns. JSON is
              not, so a converter has to decide what the grid is. This tool uses the
              simplest rule that keeps data lossless:
            </p>
            <ProseList
              items={[
                <>
                  <strong className="font-medium text-slate-900">Each array element is one
                  row.</strong>{" "}
                  A single object is wrapped in a one-element array, so both shapes convert.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Columns are the union of all
                  keys</strong>{" "}
                  across rows, in first-appearance order. A key that only some rows have
                  leaves an empty cell in the others — no row is padded or dropped.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Nested objects become dotted
                  columns</strong>{" "}
                  when flattening is on: <code className="font-mono text-[12px]">customer.email</code>.
                  Turn it off to keep each row as one JSON string in a single{" "}
                  <code className="font-mono text-[12px]">json</code> column.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Arrays inside rows stay JSON</strong>{" "}
                  in one cell, because expanding <code className="font-mono text-[12px]">items.0.sku</code>…{" "}
                  <code className="font-mono text-[12px]">items.n.sku</code> into columns cannot have a
                  stable shape across heterogeneous rows.
                </>,
              ]}
            />
          </ContentSection>

          <ContentSection id="escaping" title="Escaping: what Excel actually parses">
            <p>
              The output follows RFC 4180, the closest thing CSV has to a specification.
              In practice three rules do all the work:
            </p>
            <ProseList
              items={[
                <>
                  <strong className="font-medium text-slate-900">Lines end with CRLF</strong> —{" "}
                  what Excel expects; a bare LF is tolerated but can confuse older parsers.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Fields containing the delimiter, a
                  double quote, or a line break are wrapped in quotes</strong>, and any quote
                  inside is doubled: <code className="font-mono text-[12px]">say &quot;hi&quot;</code> becomes{" "}
                  <code className="font-mono text-[12px]">&quot;say &quot;&quot;hi&quot;&quot;&quot;</code>.
                </>,
                <>
                  <strong className="font-medium text-slate-900">null is written as an empty
                  cell</strong>, so a mostly-numeric column stays numeric after the
                  round-trip into a spreadsheet.
                </>,
              ]}
            />
            <p>
              A note on locales: Excel in much of Europe expects semicolon-separated files
              because the comma is the decimal separator there. If your spreadsheet shows
              everything in one column, convert again with the semicolon delimiter — that
              is a locale setting, not a broken file.
            </p>
            <p>
              The failure modes that do not announce themselves — 19-digit IDs Excel rounds,
              ZIP codes that lose their leading zero, nested objects flattened past
              recognition — are covered in{" "}
              <Link
                href="/guides/convert-json-to-csv"
                className="text-blue-700 underline underline-offset-2"
              >
                Converting JSON to CSV: what breaks on the way
              </Link>
              . Going the other direction,{" "}
              <Link href="/csv-to-json" className="text-blue-700 underline underline-offset-2">
                CSV to JSON
              </Link>{" "}
              reads the same quoting rules back in.
            </p>
          </ContentSection>

          <ContentSection id="pro" title="DevTinyTools Pro">
            <p>
              The free converter handles the payloads most people paste by hand. Pro is
              for the workflows that outgrow it — exporting a folder of API dumps, or a
              document too large for a comfortable tab session:
            </p>
            <ProseList items={PRO_FEATURES} />
            <p>
              Pro is {PRO_PRICE_LIFETIME} one-time — a lifetime licence, sold
              through Lemon Squeezy as merchant of record, so VAT and sales tax are
              handled for you. Pro is a licence key — there is still no account.{" "}
              <a
                href={getProCheckoutUrl() ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 underline underline-offset-2"
              >
                Buy DevTinyTools Pro
              </a>
              , then activate it below and the higher limits unlock in this browser.
            </p>
            <LicenseDialog />
          </ContentSection>

          <FaqSection items={FAQ} path={PATH} />

          <RelatedTools current={PATH} />
        </div>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "JSON to CSV Converter",
          url: absoluteUrl(PATH),
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript",
          description:
            "Convert a JSON array to CSV in the browser. Nested objects flatten into dotted columns and the output is RFC 4180 compliant.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          isAccessibleForFree: true,
        }}
      />
    </>
  );
}
