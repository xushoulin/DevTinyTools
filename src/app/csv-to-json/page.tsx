import { AdSlot } from "@/components/ad-slot";
import Link from "next/link";
import { ContentSection, ProseList, StepList } from "@/components/content-section";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { RelatedTools } from "@/components/related-tools";
import { LicenseDialog } from "@/components/license-dialog";
import { ToolPageHeader } from "@/components/tool-page-header";
import { CsvToJsonTool } from "@/components/tools/csv-to-json-tool";
import { pageMetadata } from "@/lib/metadata";
import {
  CSV_PRO_CHAR_LIMIT,
  PRO_PRICE_LIFETIME,
  getProCheckoutUrl,
} from "@/lib/pro";
import { absoluteUrl } from "@/lib/site";

const PATH = "/csv-to-json";

export const metadata = pageMetadata({
  title: "CSV to JSON Converter",
  description:
    "Convert CSV to JSON in the browser. Quoted commas, delimiter detection, dotted headers unflattened, and numbers converted only when they round-trip exactly.",
  path: PATH,
});

const FAQ = [
  {
    question: "Which CSV dialects does this parse?",
    answer:
      "RFC 4180, which covers what Excel, Google Sheets and every mainstream exporter produce: quoted fields may contain the delimiter, doubled quotes and line breaks, and rows can end with CRLF or LF. An unclosed quote is reported as an error instead of silently swallowing the rest of the file.",
  },
  {
    question: "How does delimiter detection work?",
    answer:
      "It counts commas, semicolons and tabs outside quoted fields and uses whichever appears most. A European export where quoted cells contain commas but semicolons separate fields is detected correctly. You can override it manually if a file has no separators at all.",
  },
  {
    question: "Why did 19.50 stay a string?",
    answer:
      "Because JSON has no way to write 19.50 without rewriting it: the number 19.5 prints as 19.5, and the trailing zero — which may be meaningful in a price list — is gone. The tool converts a cell only when the value round-trips to the exact same text, so 19.5 becomes a number but 19.50 and 15-digit IDs stay strings. Turn off the inference checkbox to keep everything as text.",
  },
  {
    question: "What do empty cells become?",
    answer:
      "null, when type inference is on. That matches the JSON-to-CSV direction on this site, where null is written as an empty cell, so a JSON → CSV → JSON round trip comes back unchanged. With inference off, empty cells stay as empty strings.",
  },
  {
    question: "What happens to dotted header names?",
    answer:
      "With unflattening enabled, customer.name becomes a nested object: {\"customer\": {\"name\": …}}. That is the inverse of the flattening the JSON-to-CSV tool applies, so files it produced convert back to their original shape. Disable the checkbox to keep every header as a literal flat key.",
  },
  {
    question: "What happens when rows have different column counts?",
    answer:
      "Short rows are padded with null and surplus cells are dropped, and a warning names the situation — nothing fails and nothing is silently reshaped. Ragged rows are common in hand-maintained spreadsheets and usually mean a formula stopped copying.",
  },
  {
    question: "How are duplicate header names handled?",
    answer:
      "The second occurrence is renamed with a numeric suffix (id and id_2), because JSON objects cannot hold duplicate keys — the second would silently overwrite the first. Empty header cells become column1, column2 and so on.",
  },
  {
    question: "Is my CSV uploaded anywhere?",
    answer:
      "No. Parsing, type inference and serialisation all happen in the tab with browser APIs, and the file picker uses FileReader. You can confirm that in the network panel: no request is made during a conversion.",
  },
];

const PRO_FEATURES = [
  `${new Intl.NumberFormat("en-US").format(CSV_PRO_CHAR_LIMIT)}-character documents, roughly 10 MB of CSV`,
  "The same Pro licence unlocks every tool on the site — conversion, diffing, type generation and batch ZIP export",
  "Priority fixes — conversion bugs move to the front of the queue",
];

export default function CsvToJsonPage() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ToolPageHeader
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Tools", href: "/#tools" },
            { label: "CSV to JSON" },
          ]}
          title="CSV to JSON Converter"
          description="Paste CSV, get clean JSON. Quoted commas and line breaks are parsed per RFC 4180, dotted headers unflatten into nested objects, and numbers are only converted when the text round-trips exactly."
        />

        <div className="mt-6">
          <CsvToJsonTool />
        </div>

        <AdSlot slot="toolBelow" />

        <div className="mt-12 space-y-10">
          <ContentSection id="how-to" title="How to convert CSV to JSON">
            <StepList
              steps={[
                {
                  title: "Paste your CSV",
                  body: "into the input panel, open a .csv file, or press “Load example” for a file with quoted commas, empty cells and ambiguous numbers.",
                },
                {
                  title: "Check the options",
                  body: "Delimiter detection is on by default and handles Excel commas, European semicolons and TSV. Keep “first row is column names” on unless your file starts with data.",
                },
                {
                  title: "Press Convert to JSON",
                  body: "Records appear on the right, one object per row. Notes about ragged rows, renamed duplicate headers or the detected delimiter are listed under the output.",
                },
                {
                  title: "Copy or download",
                  body: "The output is pretty-printed JSON with two-space indent, ready to paste into a config, an API test or a seed script.",
                },
              ]}
            />
          </ContentSection>

          <ContentSection id="typing" title="The typing rule: convert only what round-trips">
            <p>
              Most converters turn anything numeric into a number, and that is where
              data gets rewritten without anyone noticing. Three concrete losses:
            </p>
            <ProseList
              items={[
                <>
                  <strong className="font-medium text-slate-900">Trailing zeros.</strong>{" "}
                  The price text <code className="font-mono text-[12px]">19.50</code> becomes
                  the number <code className="font-mono text-[12px]">19.5</code> — and when it
                  prints again, the zero is gone.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Leading zeros.</strong>{" "}
                  <code className="font-mono text-[12px]">02134</code> is a ZIP code, not the
                  number 2134. Converting it breaks the address.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Big IDs.</strong> Any integer
                  past 2<sup>53</sup> loses its final digits when stored as a double — the same{" "}
                  <Link
                    href="/guides/why-json-numbers-lose-precision"
                    className="text-blue-700 underline underline-offset-2"
                  >
                    precision ceiling every JSON number shares
                  </Link>
                  .
                </>,
              ]}
            />
            <p>
              The rule this tool uses: a cell becomes a number only when{" "}
              <code className="font-mono text-[12px]">String(Number(cell))</code> is the
              exact text it started from. Everything else — <code className="font-mono text-[12px]">19.50</code>,{" "}
              <code className="font-mono text-[12px]">02134</code>, 19-digit IDs, scientific
              notation — stays a string, so the JSON you get says what the CSV said.
            </p>
            <p>
              Booleans follow the same standard: <code className="font-mono text-[12px]">true</code>{" "}
              and <code className="font-mono text-[12px]">false</code> convert;{" "}
              <code className="font-mono text-[12px]">TRUE</code>, <code className="font-mono text-[12px]">yes</code>{" "}
              and <code className="font-mono text-[12px]">1</code> do not, because a spreadsheet that
              stores <code className="font-mono text-[12px]">TRUE</code> as text meant it as text more
              often than not.
            </p>
          </ContentSection>

          <ContentSection id="parsing" title="What the parser handles, strictly">
            <ProseList
              items={[
                <>
                  <strong className="font-medium text-slate-900">Quoted everything.</strong>{" "}
                  Fields may contain the delimiter, doubled quotes and raw line breaks —{" "}
                  <code className="font-mono text-[12px]">&quot;Item: keyboard, USB&quot;</code> stays one
                  cell.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Delimiter detection.</strong>{" "}
                  Counts separators outside quotes, so semicolon files whose quoted cells
                  contain commas are not misread.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Unclosed quotes fail loudly.</strong>{" "}
                  A missing closing quote is reported as an error rather than absorbed into
                  one giant cell — the failure mode that makes other converters lose half a
                  file silently.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Ragged rows are padded, with a
                  warning.</strong>{" "}
                  Missing cells become null and surplus cells are dropped; the notes panel
                  tells you it happened instead of letting the shape shift quietly.
                </>,
              ]}
            />
          </ContentSection>

          <ContentSection id="round-trip" title="Round-tripping with the JSON to CSV tool">
            <p>
              The two converters on this site are designed as a pair.{" "}
              <Link href="/json-to-csv" className="text-blue-700 underline underline-offset-2">
                JSON to CSV
              </Link>{" "}
              flattens nested objects into dotted columns, writes null as an empty cell and
              prints numbers exactly. This tool reverses all three: dotted headers unflatten
              back into objects, empty cells become null, and the exactness rule accepts the
              numbers it produced.
            </p>
            <p>
              The round trip is not universal — arrays inside rows travelled as JSON text in
              one cell, so they come back as strings. For flat-and-nested objects without
              arrays, what goes in is what comes out, cell for cell. The losses that survive
              a spreadsheet — rounded IDs, eaten leading zeros — are collected in{" "}
              <Link
                href="/guides/convert-json-to-csv"
                className="text-blue-700 underline underline-offset-2"
              >
                Converting JSON to CSV: what breaks on the way
              </Link>
              .
            </p>
          </ContentSection>

          <ContentSection id="pro" title="DevTinyTools Pro">
            <p>
              The free converter handles the payloads most people paste by hand. Pro
              raises the document cap and unlocks every other tool on the site:
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
          name: "CSV to JSON Converter",
          url: absoluteUrl(PATH),
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript",
          description:
            "Convert CSV to JSON in the browser. RFC 4180 parsing, delimiter detection, dotted headers unflatten into nested objects, and numbers convert only when they round-trip exactly.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          isAccessibleForFree: true,
        }}
      />
    </>
  );
}
