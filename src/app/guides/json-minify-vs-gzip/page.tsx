import Link from "next/link";
import { ContentSection, ProseList } from "@/components/content-section";
import { FaqSection } from "@/components/faq-section";
import { GuideShell } from "@/components/guide-shell";
import { getGuide } from "@/lib/guides";
import { SIZE_MEASUREMENTS } from "@/lib/json-references";
import { pageMetadata } from "@/lib/metadata";

const SLUG = "json-minify-vs-gzip";
const guide = getGuide(SLUG)!;

export const metadata = pageMetadata({
  title: guide.title,
  description: guide.description,
  path: guide.href,
});

const FAQ = [
  {
    question: "So should I stop minifying entirely?",
    answer:
      "No — minify for storage, logs, URLs and message queues, where compression may not be applied at all. For HTTP responses that are already compressed, the gain is small enough that it should not be your first optimisation.",
  },
  {
    question: "Why does indentation compress so well?",
    answer:
      "Indentation is a repeating pattern: the same two spaces, in runs whose length is predictable from nesting depth. gzip and brotli encode that as a handful of back-references, so 96 KB of whitespace costs a few hundred bytes on the wire.",
  },
  {
    question: "Does the saving depend on the document?",
    answer:
      "Yes. A document with few repeated keys compresses less, so minification keeps more of its advantage. The numbers here come from a 400-order document with a repeated object shape, which is close to the best case for a compressor and therefore close to the worst case for minification.",
  },
  {
    question: "Does minifying change the data?",
    answer:
      "Not if it is done by a real parser rather than a regular expression. The minifier here parses the document and re-serialises it, which removes whitespace and normalises number formatting at the same time — see the precision guide for what normalisation can change.",
  },
];

export default function Page() {
  return (
    <GuideShell guide={guide}>
      <ContentSection id="measurement" title="The measurement">
        <p>
          One real document: 400 orders, an array of objects with a consistent shape, 2-space
          indentation. It was measured raw, minified, and then compressed with both gzip at
          its highest level and brotli at its default quality.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
            <caption className="sr-only">Size of one document in six forms</caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-3 py-2 font-semibold">
                  Form
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Size
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Compared with
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {SIZE_MEASUREMENTS.map((row) => (
                <tr key={row.form}>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-800">{row.form}</td>
                  <td className="px-3 py-2.5 font-mono text-[12px] whitespace-nowrap text-slate-800">
                    {row.size}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Read the middle two rows together. Minification removes 96,833 bytes from the raw
          file — a 43.7% cut that looks excellent until you compress. After gzip the same
          minification is worth 1,179 bytes, and after brotli it is worth 247 bytes. The
          whitespace was never the expensive part.
        </p>
      </ContentSection>

      <ContentSection id="why" title="Why the saving disappears">
        <p>
          gzip and brotli are back-reference compressors: they look for repeated byte
          sequences and replace each repeat with a short pointer. Indentation is almost
          nothing but repeats — the same two spaces, in runs whose length is predictable
          from the nesting depth — so it costs a handful of pointers instead of 96 KB.
        </p>
        <p>
          What compresses badly is entropy: unique keys, random IDs, timestamps and
          free-text values. Those are exactly the bytes minification leaves untouched. That
          is the whole explanation, and it generalises to almost any JSON payload.
        </p>
      </ContentSection>

      <ContentSection id="bigger-lever" title="The bigger lever is not minification">
        <p>
          Compare the two ways of shrinking the wire size. Minifying on top of gzip saves
          10.8%. Switching from gzip to brotli, with no change to the document at all, takes
          10,879 bytes down to 5,038 — a 53.7% reduction. Enabling brotli is roughly five
          times the win, and it is a server configuration change rather than a build step.
        </p>
        <p>
          The ordering that follows is: enable compression first, remove unused fields
          second, minify third. Dropping a field nobody reads beats every whitespace
          decision you will ever make.
        </p>
      </ContentSection>

      <ContentSection id="still-wins" title="Where minifying still wins">
        <ProseList
          items={[
            <>
              <strong className="font-medium text-slate-900">When compression is off.</strong>{" "}
              A surprising number of internal services, misconfigured proxies and CDN rules
              serve JSON with no <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">Content-Encoding</code>{" "}
              at all. There, the raw 43.7% is real.
            </>,
            <>
              <strong className="font-medium text-slate-900">Storage with size limits.</strong>{" "}
              Rows in a database, keys in Redis, entries in <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">localStorage</code>{" "}
              and files on disk are often stored uncompressed, and often have quotas.
            </>,
            <>
              <strong className="font-medium text-slate-900">Message queues and sockets.</strong>{" "}
              Payload caps on queues and log pipelines are measured on the uncompressed body.
              WebSocket frames are not compressed unless <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">permessage-deflate</code>{" "}
              was negotiated.
            </>,
            <>
              <strong className="font-medium text-slate-900">Anything in a URL.</strong> A
              document encoded into a query string or a share link is transferred
              uncompressed, and every byte counts against a length limit.
            </>,
            <>
              <strong className="font-medium text-slate-900">Signing and hashing.</strong>{" "}
              Here minification is about determinism, not size: two serialisations of the
              same object differ in whitespace, so sign one canonical form and verify that
              same form.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="how-to-check" title="How to check your own traffic">
        <p>
          Open the network panel, click the JSON request, and look at the{" "}
          <strong className="font-medium text-slate-900">Size</strong> column: it shows the
          transferred size, and the response headers show whether{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">content-encoding</code>{" "}
          is <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">gzip</code> or{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">br</code>. From a
          terminal, ask for both and read the header:
        </p>
        <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-[12px] leading-relaxed text-slate-700">
          <code>{`curl -sI -H 'Accept-Encoding: gzip, br' https://example.com/data.json \\
  | grep -iE 'content-encoding|content-length'`}</code>
        </pre>
        <p>
          If there is no <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">content-encoding</code>{" "}
          line, the response is going out uncompressed — fix that before spending any time on
          the minifier. If it says <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">br</code>,
          you are already at the best point on this chart.
        </p>
        <p>
          To see the raw numbers for your own document, the{" "}
          <Link href="/json-minifier" className="text-blue-700 underline underline-offset-2">
            JSON Minifier
          </Link>{" "}
          reports character and byte counts before and after, without sending anything
          anywhere.
        </p>
      </ContentSection>

      <FaqSection items={FAQ} path={guide.href} />
    </GuideShell>
  );
}
