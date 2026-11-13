import Link from "next/link";
import { ContentSection, ProseList } from "@/components/content-section";
import { FaqSection } from "@/components/faq-section";
import { GuideShell } from "@/components/guide-shell";
import { getGuide } from "@/lib/guides";
import { pageMetadata } from "@/lib/metadata";

const SLUG = "convert-json-to-csv";
const guide = getGuide(SLUG)!;

export const metadata = pageMetadata({
  // The H1 needs the full sentence; the SERP title has to leave room for the
  // 16-character site suffix and still fit inside 60 characters.
  title: "JSON to CSV: what breaks on the way",
  description: guide.description,
  path: guide.href,
});

const FAQ = [
  {
    question: "Why does a long ID show as 7.31E+18 after the conversion?",
    answer:
      "Excel keeps 15 significant digits and displays large numbers in scientific notation. A 19-digit order ID stored as a number has already lost its last digits before you ever see the cell — the fix is to keep it as text, which means the converter must quote it and Excel must not re-parse it.",
  },
  {
    question: "My ZIP codes lost their leading zero. Who ate it?",
    answer:
      "The spreadsheet did, on import. CSV is typeless, so \"02134\" is just text, and Excel's default importer decides anything that looks numeric is a number, dropping the zero. Import the column as text explicitly, or prefix and strip a sentinel character.",
  },
  {
    question: "Should an array value become several rows?",
    answer:
      "Usually no. Splitting an array across rows duplicates the parent record and inflates counts when the file is filtered or pivoted. Serialise the array as a JSON string inside one cell unless you specifically need a long-format table.",
  },
  {
    question: "Why do some CSVs use semicolons instead of commas?",
    answer:
      "Locale. In much of Europe the decimal comma is the system setting, so list separators moved to semicolons and Excel's importer follows that setting. A comma-separated file can open as one giant column there — pick the delimiter deliberately rather than accepting the default.",
  },
];

export default function Page() {
  return (
    <GuideShell guide={guide}>
      <ContentSection id="two-models" title="Two formats, two models of the data">
        <p>
          JSON has types: a string, a number, a boolean, null, an object, an array. CSV has
          none of that — every cell is text, rows are independent, and a column is only a
          convention that the same position in each row happens to mean the same thing. A
          conversion is a translation between those two models, and every interesting bug in
          a converted file is one of the model differences showing through.
        </p>
        <p>
          The four differences that cause nearly all of the trouble: precision (numbers),
          nesting (objects and arrays), quoting (strings that contain the delimiter), and
          identity (what a row even is when the records have different keys).
        </p>
      </ContentSection>

      <ContentSection id="precision" title="The ID that arrives wrong">
        <p>
          The classic silent failure: an order or user ID with 17–19 digits converts fine,
          the file opens fine, and the ID is wrong. Two independent mechanisms do this, and
          it is worth telling them apart because the fixes differ.
        </p>
        <ProseList
          items={[
            <>
              <strong className="font-medium text-slate-900">The parse step.</strong> Any
              JSON parser built on IEEE-754 doubles — JavaScript&apos;s{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">JSON.parse</code>{" "}
              among them — cannot represent integers exactly above 2^53. Past that point the
              last digits are rounded <em>during parsing</em>, before any conversion happens.
              A converter that parses and re-serialises has already changed the value.
            </>,
            <>
              <strong className="font-medium text-slate-900">The spreadsheet step.</strong>{" "}
              Excel keeps 15 significant digits and reformats long numbers in scientific
              notation, so a 19-digit ID survives the file and dies in the display: the
              trailing digits are zeroed on import. The fix is to keep the column as text,
              which only works if the CSV quotes the value and the importer is told not to
              re-parse it.
            </>,
          ]}
        />
        <p>
          If the IDs matter, the honest answer is that a text-based round trip through a
          spreadsheet is the wrong tool — treat them as strings end to end, or keep IDs out
          of the spreadsheet entirely. If you only need to spot-check the data, the{" "}
          <Link href="/json-to-csv" className="text-blue-700 underline underline-offset-2">
            JSON to CSV converter
          </Link>{" "}
          quotes string values exactly as they appear in the source document.
        </p>
      </ContentSection>

      <ContentSection id="nesting" title="Nested objects have no seat in a spreadsheet">
        <p>
          A spreadsheet row is flat: one value per column. A JSON record can nest an address
          inside a customer inside an order. The converter has to decide what that object
          becomes, and each choice has a failure mode:
        </p>
        <ProseList
          items={[
            <>
              <strong className="font-medium text-slate-900">Flatten to dotted columns.</strong>{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">customer.address.city</code>{" "}
              becomes a column header. This is the most useful default for analysis, but the
              headers grow long, and two records with different nesting produce different
              column sets — the converter must union the columns and leave the missing cells
              empty rather than dropping data.
            </>,
            <>
              <strong className="font-medium text-slate-900">Serialise into one cell.</strong>{" "}
              The nested value becomes a JSON string inside a cell. Nothing is lost, but the
              cell is unreadable without another parse — you have deferred the problem, not
              solved it. Useful for arrays you will process later; useless for fields you
              want to filter on.
            </>,
            <>
              <strong className="font-medium text-slate-900">Split into more rows.</strong>{" "}
              Each array element becomes a row, duplicating the parent record. Legitimate
              for long-format analysis, but every downstream count is now per-element, not
              per-record, and joins back to the original data need a key column that still
              exists.
            </>,
          ]}
        />
        <p>
          There is no universally right choice — the question is what the spreadsheet is
          for. Filtering and pivoting want flattening; archival fidelity wants serialised
          cells; per-element analysis wants the long format.
        </p>
      </ContentSection>

      <ContentSection id="quoting" title="The quoting rules a naive converter misses">
        <p>
          RFC 4180, the de-facto CSV standard, is short, and almost every broken CSV
          violates one of its three rules. A value containing a comma, a double quote or a
          line break must be wrapped in double quotes, and an embedded quote is escaped by
          doubling it. Naive converters — usually a{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">join(&quot;,&quot;)</code>{" "}
          over stringified fields — do none of this, and the file still opens, which is what
          makes the damage easy to miss:
        </p>
        <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-[12px] leading-relaxed text-slate-700">
          <code>{`name,note
Ada,"said ""hello"", then left"
Grace,"line one
line two"`}</code>
        </pre>
        <p>
          In the correct file above, row one is two cells and row two&apos;s second cell
          legitimately contains a newline. Open the unquoted version of the same data and
          the row boundary has moved: every field after the embedded comma shifts one
          column, and the note&apos;s second line becomes a record of its own. Nothing
          errors — the data is just wrong, quietly.
        </p>
        <p>
          The other quoting trap is invisible until the file is opened on another machine:
          Excel on Windows reads a UTF-8 file without a byte-order mark using the legacy
          code page, and every non-ASCII character — accented names, CJK text, currency
          symbols — turns into mojibake. Writing a BOM is the one pragmatic fix, standards
          notwithstanding.
        </p>
      </ContentSection>

      <ContentSection id="checklist" title="A conversion checklist">
        <ProseList
          items={[
            <>
              <strong className="font-medium text-slate-900">IDs stay text.</strong> Any
              identifier longer than 15 digits must survive as a string. If it did not,
              check whether it was already rounded at parse time — see the precision guide
              on what{" "}
              <Link
                href="/guides/why-json-numbers-lose-precision"
                className="text-blue-700 underline underline-offset-2"
              >
                JSON.parse does above 2^53
              </Link>
              .
            </>,
            <>
              <strong className="font-medium text-slate-900">Spot-check the row count.</strong>{" "}
              Rows in the CSV should equal elements in the array. More rows means an
              embedded newline was not quoted; fewer means a record was dropped.
            </>,
            <>
              <strong className="font-medium text-slate-900">Union the columns.</strong>{" "}
              Real-world records rarely share a schema. The header should cover every key
              that appears in any record, with empty cells for the gaps — not silently
              dropped fields.
            </>,
            <>
              <strong className="font-medium text-slate-900">Pick the delimiter on purpose.</strong>{" "}
              Commas everywhere except where the destination spreadsheet&apos;s locale
              expects semicolons or tabs.
            </>,
            <>
              <strong className="font-medium text-slate-900">Decide null.</strong> JSON{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">null</code>, a
              missing key and an empty string are three different things that CSV can only
              render as the same empty cell. Pick one convention and keep it stable across
              conversions.
            </>,
          ]}
        />
        <p>
          To check your own document against this list, the{" "}
          <Link href="/json-to-csv" className="text-blue-700 underline underline-offset-2">
            JSON to CSV converter
          </Link>{" "}
          runs the conversion in your browser — paste the JSON, choose the delimiter and
          nesting options, and download the file. Nothing is uploaded, so real customer data
          is safe to run through it.
        </p>
      </ContentSection>

      <FaqSection items={FAQ} path={guide.href} />
    </GuideShell>
  );
}
