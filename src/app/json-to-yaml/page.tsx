import Link from "next/link";

import { AdSlot } from "@/components/ad-slot";
import { ContentSection, InlineCode, ProseList, StepList } from "@/components/content-section";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { RelatedTools } from "@/components/related-tools";
import { ToolPageHeader } from "@/components/tool-page-header";
import { JsonToYamlTool } from "@/components/tools/json-to-yaml-tool";
import { pageMetadata } from "@/lib/metadata";
import { absoluteUrl } from "@/lib/site";

const PATH = "/json-to-yaml";

export const metadata = pageMetadata({
  title: "JSON to YAML Converter (and back)",
  description:
    "Convert JSON to YAML or YAML to JSON in your browser. Multiple documents, error line numbers and YAML 1.2 semantics handled. Nothing is uploaded.",
  path: PATH,
});

const FAQ = [
  {
    question: "Is YAML valid JSON?",
    answer:
      "Almost. Every JSON document is also a YAML 1.2 document, because YAML 1.2's core schema is a superset of JSON. The reverse is not true: YAML allows comments, unquoted keys, block scalars, anchors, and indentation instead of braces — none of which a JSON parser accepts. That is why converting YAML to JSON can be lossless for the data but never carries comments over.",
  },
  {
    question: "Why did my port number become a string?",
    answer:
      "Because it was written with quotes in the YAML: port: \"8080\" means the string 8080, while port: 8080 means the number. YAML readers obey the quotes exactly like JSON does. The trap runs the other way too — an unquoted version number like 1.20 is a float in both formats, and the YAML file for a Kubernetes image tag or an iOS build number must be quoted to survive the round trip.",
  },
  {
    question: "What happens to yes, no, on and off?",
    answer:
      "Under YAML 1.1 — what most older libraries implement — those words are booleans, so service: on became true. The YAML 1.2 spec, which is what this tool and every modern parser follows, keeps them as plain strings and reserves only true and false. If your old pipeline turns yes into true, it is reading YAML 1.1; quote the value to force a string everywhere.",
  },
  {
    question: "How are multiple YAML documents handled?",
    answer:
      "A file that contains several --- separated documents is a stream, and JSON has no equivalent inside a single document. Instead of dropping documents, this tool converts the whole stream into one JSON array in file order. Converting a single-document file gives you the value itself, not an array, so the common case stays clean.",
  },
  {
    question: "Why does my YAML fail with an indentation error?",
    answer:
      "YAML uses indentation to express nesting, so the parser is unforgiving: tabs are illegal, two-space and four-space levels cannot be mixed on the same subtree, and a value must sit on the same line as its key unless you are using a block scalar. The converter reports the line number the parser blames, which in practice points at the line after the mistake as often as at the mistake itself.",
  },
  {
    question: "Are YAML comments and anchors preserved?",
    answer:
      "Comments are not — JSON has no syntax for them, so # remarks are dropped on the way to JSON. Anchors (&name) and aliases (*name) are resolved first: the JSON contains the referenced value expanded at every place the alias appeared. If you need the anchors themselves kept, the file has to stay YAML, because JSON cannot express them.",
  },
  {
    question: "Is YAML smaller than JSON?",
    answer:
      "For nested mappings, yes: braces, quotes and commas disappear. For flat data the difference is small, and arrays of scalars can come out slightly longer because each element needs its own - line. Comments and blank lines make real-world YAML files longer than the equivalent JSON, so converting to JSON often shrinks a well-commented config file.",
  },
  {
    question: "Is the conversion done in my browser?",
    answer:
      "Yes. The JSON side is read by the browser's own JSON.parse and the YAML side by a small parser that runs in the tab. Nothing is sent anywhere, nothing is stored, and the page works offline once it has loaded.",
  },
];

export default function JsonToYamlPage() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ToolPageHeader
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Tools", href: "/tools" },
            { label: "JSON ↔ YAML" },
          ]}
          title="JSON to YAML, YAML to JSON"
          description="Convert in both directions as you type. Multi-document files become a JSON array, errors get a line number, and YAML 1.2 typing rules are applied — quoted values stay strings."
        />

        <div className="mt-6">
          <JsonToYamlTool />
        </div>

        <AdSlot slot="toolBelow" />

        <div className="mt-12 space-y-10">
          <ContentSection id="how-to" title="How to convert between JSON and YAML">
            <StepList
              steps={[
                {
                  title: "Pick a direction",
                  body: "JSON → YAML turns a JSON document into indented YAML. YAML → JSON does the reverse and pretty-prints the result.",
                },
                {
                  title: "Paste into the left panel",
                  body: "Conversion happens as you type; there is no run button and no upload. Load example shows a deployment-style config in whichever format the direction expects.",
                },
                {
                  title: "Choose the indentation",
                  body: "Two spaces or four. The setting applies to the nesting levels of the YAML, or to the pretty-printed JSON on the way back.",
                },
                {
                  title: "Use Swap to check the round trip",
                  body: "After converting, Swap moves the output into the input and flips the direction. A config that survives JSON → YAML → JSON unchanged is safe to ship.",
                },
              ]}
            />
          </ContentSection>

          <ContentSection id="what-changes" title="What actually changes between the two formats">
            <p>
              JSON and YAML 1.2 describe the same data model: maps, sequences, strings, numbers,
              booleans and null. The formats differ only in how those values are written down, so
              a converter has exactly three jobs — rewrite the syntax, keep every
              value&apos;s type honest, and tell you loudly when it cannot.
            </p>
            <ProseList
              items={[
                <>
                  <strong className="font-medium text-slate-900">Structure</strong> moves from
                  braces and brackets to indentation. Two spaces per level is the convention, four
                  is legal, tabs are not.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Quotes</strong> become optional
                  around most keys and values — but only most. Strings that look like numbers,
                  booleans or null must stay quoted, which is where{" "}
                  <InlineCode>&quot;8080&quot;</InlineCode> and{" "}
                  <InlineCode>&quot;true&quot;</InlineCode> come from.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Comments</strong> exist in YAML
                  and not in JSON, so every <InlineCode># remark</InlineCode> is lost on the way
                  over. Plan for it: keep a commented copy, or move the remark into a{" "}
                  <InlineCode>description</InlineCode> key.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Multi-document streams</strong>{" "}
                  (<InlineCode>---</InlineCode> separated files) have no single-document JSON
                  equivalent, so they arrive as one JSON array.
                </>,
              ]}
            />
          </ContentSection>

          <ContentSection id="typing-traps" title="The typing traps that survive conversion">
            <p>
              The data model is shared, but the readers are not identical. Three cases come up
              again and again in real config files:
            </p>
            <ProseList
              items={[
                <>
                  <strong className="font-medium text-slate-900">Version strings.</strong>{" "}
                  <InlineCode>version: 1.20</InlineCode> is the number 1.2 once the trailing zero
                  is parsed away, and <InlineCode>version: 1.10</InlineCode> becomes 1.1. Quote
                  every version, tag and build number.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Yes and no.</strong> YAML 1.1
                  readers parse them as booleans; YAML 1.2 does not. A file that flips behaviour
                  between two environments is usually meeting two different YAML versions.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Leading zeros.</strong>{" "}
                  <InlineCode>zip: 02134</InlineCode> is the number 2134 in YAML 1.1 readers and
                  the string 02134 in YAML 1.2. The same digits in JSON are always a string if
                  quoted and a syntax question if not.
                </>,
              ]}
            />
            <p>
              This tool applies YAML 1.2 rules on the way in, and the JSON → YAML direction
              re-quotes anything that a YAML reader would otherwise misread, so round trips keep
              both the value and the type.
            </p>
            <p>
              Config typing is not the only place JSON quietly reshapes values — numbers in API
              payloads have their own set of traps, covered in the guide to{" "}
              <Link
                href="/guides/json-numbers-precision-loss"
                className="text-blue-700 underline underline-offset-2"
              >
                precision loss in JSON numbers
              </Link>
              .
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
          name: "JSON to YAML Converter",
          url: absoluteUrl(PATH),
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript",
          description:
            "Convert JSON to YAML or YAML to JSON in the browser, with multi-document support and error line numbers.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          isAccessibleForFree: true,
        }}
      />
    </>
  );
}
