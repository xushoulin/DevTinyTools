import { AdSlot } from "@/components/ad-slot";
import Link from "next/link";
import { ContentSection, ProseList, StepList } from "@/components/content-section";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { RelatedTools } from "@/components/related-tools";
import { LicenseDialog } from "@/components/license-dialog";
import { ToolPageHeader } from "@/components/tool-page-header";
import { JsonToTypeScriptTool } from "@/components/tools/json-to-typescript-tool";
import { pageMetadata } from "@/lib/metadata";
import { PRO_PRICE_LIFETIME, TYPE_PRO_CHAR_LIMIT, getProCheckoutUrl } from "@/lib/pro";
import { absoluteUrl } from "@/lib/site";

const PATH = "/json-to-typescript";

export const metadata = pageMetadata({
  title: "JSON to TypeScript, Zod & Schema Generator",
  description:
    "Generate TypeScript interfaces, a Zod schema or a JSON Schema from JSON. Every array element is sampled, so keys only some records carry become optional.",
  path: PATH,
});

const PRO_FEATURES = [
  <>
    <strong className="font-medium text-slate-900">Zod, JSON Schema and OpenAPI output</strong>{" "}
    — the same inference, emitted as <code className="font-mono text-[12px]">z.object</code>{" "}
    calls with <code className="font-mono text-[12px]">.optional()</code> and{" "}
    <code className="font-mono text-[12px]">.nullable()</code> already applied, as a draft
    2020-12 JSON Schema with <code className="font-mono text-[12px]">$defs</code>,{" "}
    <code className="font-mono text-[12px]">$ref</code> and a computed{" "}
    <code className="font-mono text-[12px]">required</code> list, or as an OpenAPI 3.1 document
    Swagger UI and Postman import directly.
  </>,
  <>
    <strong className="font-medium text-slate-900">
      Up to {new Intl.NumberFormat("en-US").format(TYPE_PRO_CHAR_LIMIT)} characters per
      document
    </strong>{" "}
    — for the multi-megabyte API dumps that a browser tab can hold but a free session will
    not.
  </>,
  <>
    <strong className="font-medium text-slate-900">Lifetime licence</strong> — one payment,
    no subscription, and the tool keeps working after the next round of updates.
  </>,
];

const FAQ = [
  {
    question: "What does the JSON Schema output include?",
    answer:
      "A draft 2020-12 document: the root object inlined at the top level, nested objects in $defs referenced with $ref, required computed from every sampled array element, additionalProperties set to false, and integer versus number chosen the same way the Go output picks int64 versus float64. Validate it with any draft 2020-12 checker such as Ajv.",
  },
  {
    question: "Is the OpenAPI document usable without endpoints?",
    answer:
      "Yes. OpenAPI 3.1 made paths optional, and this generator emits the parts a JSON sample can actually support: info, jsonSchemaDialect and components.schemas with every named type. Import it into Swagger UI or Postman to browse the models, or attach the components to routes you define yourself — the schema objects are standard draft 2020-12, so generators accept them unchanged.",
  },
  {
    question: "Does it sample every array element or only the first?",
    answer:
      "Every element. The inferred shapes are merged, and a key that is missing from at least one element becomes optional rather than required. This is the difference between types that type-check against your real payload and types that only describe the first row.",
  },
  {
    question: "What happens when the same key has different types?",
    answer:
      "You get a union, never a silent guess. A field that is 3 in one record and \"3\" in another becomes number | string. A null in some records joins the union as a member, and in the Zod output it becomes .nullable() instead of a three-way union where two members are enough.",
  },
  {
    question: "Why are nested objects turned into separate interfaces?",
    answer:
      "Because inline object literals get unreadable after two levels and cannot be reused. Each nested object gets a name derived from its path — a profile object under the root type User becomes UserProfile — and the parent references it by name. The names are valid TypeScript identifiers even when the JSON keys are not.",
  },
  {
    question: "Are dates typed as Date?",
    answer:
      "No, and that is deliberate. JSON has no date type: an ISO-8601 string is just a string, and pretending otherwise would produce code that fails at runtime. If you need Date objects, wrap the field after parsing — or use the Zod output and add z.coerce.date() where you know the format.",
  },
  {
    question: "What about numbers that exceed 2^53?",
    answer:
      "They have already lost precision before this tool sees them. JSON.parse turns every number into an IEEE-754 double, so 12345678901234567890 arrives as 12345678901234567000 and is typed as number either way. The JSON number precision guide covers the workaround: keep identifiers as strings in the payload.",
  },
  {
    question: "Can it read a root-level array or a bare primitive?",
    answer:
      "Yes. An array of objects names its item type after the root (Root becomes RootItem[]), and a primitive root produces a plain type alias such as export type Root = string. Arrays with an empty sample infer unknown, because there is nothing to go on.",
  },
  {
    question: "Do keys that are not valid identifiers break the output?",
    answer:
      "No. user-name and 2fa are quoted in the TypeScript output, which is valid for object types, and the generated nested type names strip the punctuation. That keeps the file compiling instead of hand-fixing keys afterwards.",
  },
  {
    question: "Is the JSON uploaded anywhere?",
    answer:
      "No. Parsing, inference and code generation all run in the tab. The file picker reads from disk with the FileReader API, and nothing is sent over the network — which is what makes it safe to paste a production API response.",
  },
];

export default function JsonToTypeScriptPage() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ToolPageHeader
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Tools", href: "/#tools" },
            { label: "JSON to TypeScript" },
          ]}
          title="JSON to TypeScript, Zod & Schema Generator"
          description="Paste a JSON response and get TypeScript interfaces that match it. Every array element is sampled, so properties that only some records carry come out optional instead of breaking the build. Pro adds Zod and JSON Schema output."
        />

        <div className="mt-6">
          <JsonToTypeScriptTool />
        </div>

        <AdSlot slot="toolBelow" />

        <div className="mt-12 space-y-10">
          <ContentSection id="how-to" title="How to generate TypeScript from JSON">
            <StepList
              steps={[
                {
                  title: "Paste the JSON, or open a .json file",
                  body: "A single object and an array of objects both work. For an API response, paste the real payload rather than a hand-written sample — the types are only as accurate as the data you give them.",
                },
                {
                  title: "Name the root type",
                  body: "Root is the default. Rename it to ApiResponse, User or Invoice before you copy; nested types are named from it, so a profile object under User becomes UserProfile rather than a generic RootProfile.",
                },
                {
                  title: "Choose interfaces, Zod or JSON Schema",
                  body: "Interfaces are erased at compile time and cost nothing at runtime. The Zod schema is a runtime validator; the JSON Schema and OpenAPI 3.1 documents are language-neutral — Ajv, a CI gate, Swagger UI or Postman can all consume them.",
                },
                {
                  title: "Press Generate, then copy or download",
                  body: "The output panel counts the types and lines it produced. Download writes a .ts file named after the root type, ready to drop into your project.",
                },
              ]}
            />
          </ContentSection>

          <ContentSection id="inference" title="What the inference actually decides">
            <p>
              A JSON sample is not a schema. Two people can look at the same payload and
              disagree about which fields are guaranteed, so the generator follows four
              rules and applies them consistently:
            </p>
            <ProseList
              items={[
                <>
                  <strong className="font-medium text-slate-900">Missing keys become
                  optional.</strong>{" "}
                  With <code className="font-mono text-[12px]">[{`{"a":1,"b":2}`},
                  {`{"a":3}`}]</code>, the result is{" "}
                  <code className="font-mono text-[12px]">{`{ a: number; b?: number }`}</code>.
                  Marking b as required would compile and then crash on the second record.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Disagreeing kinds become a
                  union.</strong>{" "}
                  <code className="font-mono text-[12px]">number | string</code> is honest;
                  picking one is a guess that fails silently at runtime.
                </>,
                <>
                  <strong className="font-medium text-slate-900">null joins the
                  union.</strong>{" "}
                  A field that is sometimes null becomes{" "}
                  <code className="font-mono text-[12px]">string | null</code>, because null
                  carries meaning — &ldquo;no value yet&rdquo; — that{" "}
                  <code className="font-mono text-[12px]">undefined</code> or an empty string
                  does not.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Nesting is
                  structural.</strong>{" "}
                  Objects inside objects and objects inside arrays are compared
                  independently, so optionality is decided at the level where the data
                  actually varies.
                </>,
              ]}
            />
            <p>
              One consequence is worth stating plainly: if your sample happens to contain a
              field in every record, it comes out required even if the API omits it
              occasionally. A generator can only describe the data it was shown. Paste a
              larger sample, or mark the field optional by hand, when you know the schema
              is looser than the sample.{" "}
              <Link
                href="/guides/generate-typescript-types-from-json"
                className="text-blue-700 underline underline-offset-2"
              >
                The full guide
              </Link>{" "}
              walks through what merging samples changes and where inference stops.
            </p>
          </ContentSection>

          <ContentSection id="interfaces-vs-zod" title="Interfaces or Zod: which one do you need">
            <p>
              Both describe the same shape, and they answer different questions.
            </p>
            <ProseList
              items={[
                <>
                  <strong className="font-medium text-slate-900">TypeScript interfaces</strong>{" "}
                  describe what your own code may pass around. They are checked at compile
                  time and disappear from the bundle, so the cost is zero. They cannot
                  validate a fetch response, because at runtime there is no such thing as an
                  interface.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Zod schemas</strong> are real
                  values. <code className="font-mono text-[12px]">schema.parse(json)</code>{" "}
                  returns typed data on success and throws a structured error naming the
                  exact path on failure. Use them at the boundaries — an API response, a
                  config file, a webhook body — where the input is not under your control.
                </>,
              ]}
            />
            <p>
              The usual setup is both: infer the TypeScript types from the schema with{" "}
              <code className="font-mono text-[12px]">z.infer</code>, so the validator and
              the types can never drift apart. That is exactly what the Zod output does — it
              emits the schema and the inferred alias together.
            </p>
          </ContentSection>

          <ContentSection id="limits" title="Where generated types stop being enough">
            <ProseList
              items={[
                <>
                  <strong className="font-medium text-slate-900">Union members are not
                  exhaustive.</strong>{" "}
                  A status field that is only ever <code className="font-mono text-[12px]">&quot;active&quot;</code>{" "}
                  in your sample is typed as string, not as the literal union. Narrow it by
                  hand once you know the allowed values.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Optional is not the same as
                  nullable.</strong>{" "}
                  <code className="font-mono text-[12px]">b?: number</code> means the key may
                  be absent; it may still not be null. The generator only writes{" "}
                  <code className="font-mono text-[12px]">| null</code> when it saw a null.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Deeply nested payloads get
                  long names.</strong>{" "}
                  Four levels down you get a declaration called{" "}
                  <code className="font-mono text-[12px]">RootOrdersItemCustomerAddress</code>.
                  Rename the root type to something short before generating; the child names
                  shrink with it.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Depth is capped.</strong>{" "}
                  Past 32 levels the generator emits{" "}
                  <code className="font-mono text-[12px]">unknown</code> rather than a
                  thousand-brace type. A payload that deep usually needs a schema written by
                  hand anyway.
                </>,
              ]}
            />
          </ContentSection>

          <ContentSection id="pro" title="DevTinyTools Pro">
            <p>
              Generating TypeScript interfaces is free and stays free. Pro is for the
              workflows that outgrow a single paste:
            </p>
            <ProseList items={PRO_FEATURES} />
            <p>
              Pro is {PRO_PRICE_LIFETIME} one-time — a lifetime licence, sold through Lemon
              Squeezy as merchant of record, so VAT and sales tax are handled for you. Pro is
              a licence key — there is still no account.{" "}
              <a
                href={getProCheckoutUrl() ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 underline underline-offset-2"
              >
                Buy DevTinyTools Pro
              </a>
              , then activate it below and the Zod output unlocks in this browser.
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
          name: "JSON to TypeScript, Zod & Schema Generator",
          url: absoluteUrl(PATH),
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript",
          description:
            "Generate TypeScript interfaces, Zod schemas or a draft 2020-12 JSON Schema from a JSON sample. Every array element is sampled so optional properties and unions are inferred from the real data.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          isAccessibleForFree: true,
        }}
      />
    </>
  );
}
