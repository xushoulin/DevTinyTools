import { AdSlot } from "@/components/ad-slot";
import Link from "next/link";
import { ContentSection, ProseList, StepList } from "@/components/content-section";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { RelatedTools } from "@/components/related-tools";
import { LicenseDialog } from "@/components/license-dialog";
import { ToolPageHeader } from "@/components/tool-page-header";
import { JsonToPythonTool } from "@/components/tools/json-to-python-tool";
import { pageMetadata } from "@/lib/metadata";
import { PRO_PRICE_LIFETIME, PYTHON_PRO_CHAR_LIMIT, getProCheckoutUrl } from "@/lib/pro";
import { absoluteUrl } from "@/lib/site";

const PATH = "/json-to-python";

export const metadata = pageMetadata({
  title: "JSON to Python Class Generator (Pydantic)",
  description:
    "Generate Python models from JSON: Pydantic v2 or dataclasses, snake_case fields, Field(alias) for the wire keys, Optional only where a key is absent or null.",
  path: PATH,
});

const FAQ = [
  {
    question: "Should I use Pydantic or a dataclass?",
    answer:
      "Pydantic if the data comes from outside your program: it validates on the way in, coerces obvious mismatches, honours the aliases that keep snake_case fields bound to camelCase keys, and exports a JSON Schema. A dataclass if the data is produced and consumed inside your own code and you want no third-party dependency at all. The same JSON generates both, so you can switch tabs and compare before deciding.",
  },
  {
    question: "Why is a field called class_ instead of class?",
    answer:
      "Because class is a Python keyword and class: str is a SyntaxError, not a warning. The generator appends a trailing underscore, which is the convention PEP 8 recommends, and moves the original key into Field(alias=\"class\"). Without that alias Pydantic would look for a field named class_, find no such key in the document, and drop the value silently.",
  },
  {
    question: "What does model_config = ConfigDict(populate_by_name=True) do?",
    answer:
      "An alias is exclusive by default in Pydantic v2: with Field(alias=\"orderId\"), Order(orderId=1) works and Order(order_id=1) does not. populate_by_name=True accepts both spellings, so deserialisation keeps reading the wire format while your own code and tests can use the Python name. It is emitted only for models that actually contain an alias.",
  },
  {
    question: "Why do some Optional fields have = None and others do not?",
    answer:
      "The two cases are different. A key that some array elements omitted becomes Optional[str] = None: absent is legal, so there is a default. A key that every element carried but one of them set to null becomes Optional[str] with no default: the key is still required, it is only the value that may be None. Collapsing both into = None would accept documents that are actually malformed.",
  },
  {
    question: "Why did the dataclass fields change order?",
    answer:
      "A dataclass raises TypeError: non-default argument follows default argument at import time if a field with a default is declared above one without. Optional fields carry = None, so they are moved to the end of the class, keeping their relative order. The generated file imports cleanly because of that reordering; the cost is that field order no longer matches the JSON.",
  },
  {
    question: "Do long integer IDs lose precision?",
    answer:
      "Python integers are arbitrary precision, so the generated int holds a 19-digit ID exactly. The limit is upstream of this tool: the text you paste is parsed with JSON.parse, and JavaScript numbers stop being exact above 2^53-1, so a longer integer is already rounded before inference sees it. Send large IDs as strings if they must survive the trip, which is also what the TypeScript and Go outputs need.",
  },
  {
    question: "Why is every field snake_case, and can I turn that off?",
    answer:
      "snake_case is what PEP 8 and linters such as ruff expect, and orderId as a field name trips N815. Turning the alias option off keeps the snake_case names but drops the mapping back to the JSON keys, which is only useful when the keys already match or when you rename them yourself at the parse boundary.",
  },
  {
    question: "Is my JSON uploaded anywhere?",
    answer:
      "No. Parsing, inference and code generation all run in this tab. The file picker uses FileReader, and no network request is made while generating — you can confirm that in your browser's network panel.",
  },
];

const PRO_FEATURES = [
  `${new Intl.NumberFormat("en-US").format(PYTHON_PRO_CHAR_LIMIT)}-character documents, roughly 10 MB of JSON`,
  "The same Pro licence unlocks every tool on the site — TypeScript, Go, Java, C#, schemas, batch ZIP export",
  "Priority fixes — generation bugs move to the front of the queue",
];

export default function JsonToPythonPage() {
  const checkoutUrl = getProCheckoutUrl();

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ToolPageHeader
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Tools", href: "/#tools" },
            { label: "JSON to Python" },
          ]}
          title="JSON to Python Class Generator"
          description="Turn a JSON response into Python models that actually load it: keyword keys renamed instead of crashing, snake_case fields wired back to the wire names, and Optional only where the data justified it."
        />

        <div className="mt-6">
          <JsonToPythonTool />
        </div>

        <AdSlot slot="toolBelow" />

        <div className="mt-12 space-y-10">
          <ContentSection id="how-to" title="How to generate Python models from JSON">
            <StepList
              steps={[
                {
                  title: "Pick Pydantic or dataclass",
                  body: "Pydantic validates and aliases; dataclasses need no dependency. The JSON shape is the same, so switching tabs costs nothing.",
                },
                {
                  title: "Paste a JSON object or array",
                  body: "or load the example: two orders with keys named class and from, which a naive generator turns into invalid Python.",
                },
                {
                  title: "Name the root class",
                  body: "The name is normalised to a valid identifier, so my order becomes MyOrder rather than a syntax error.",
                },
                {
                  title: "Copy or download the .py file",
                  body: "Models are declared children-first, so the file imports and validates without calling model_rebuild().",
                },
              ]}
            />
          </ContentSection>

          <ContentSection
            id="pydantic-vs-dataclass"
            title="Pydantic or dataclass: the choice changes what breaks later"
          >
            <p>
              Both outputs describe the same document, and the difference is where the failure
              lands. A Pydantic model rejects a wrong value at the boundary —{" "}
              <code className="font-mono text-[13px]">Order.model_validate(payload)</code> raises
              with the field path. A dataclass accepts it, and the mistake surfaces several
              functions later as an AttributeError or a nonsensical total.
            </p>
            <ProseList
              items={[
                "Reach for Pydantic when the JSON comes from an API you do not control. Validation, aliasing and JSON Schema export are exactly the three things you would otherwise hand-roll.",
                "Reach for a dataclass when the structure is internal, when import time matters, or when a third-party dependency is not allowed — it is in the standard library and adds no install step.",
                "Either way the field types come from the same inference: every array element is sampled and merged, so a key that only some records carry is optional in both outputs.",
              ]}
            />
            <p>
              One caveat that applies to both: a dataclass has no aliases. The generated file keeps
              the original key in a trailing comment, and loading raw JSON into it needs a small
              adapter (or a library such as <code className="font-mono text-[13px]">dacite</code>).
              Pydantic does that job for free, which is why it is the default tab.
            </p>
          </ContentSection>

          <ContentSection
            id="keywords"
            title="class, from and import are not valid field names"
          >
            <p>
              Real APIs send keys named <code className="font-mono text-[13px]">class</code>,{" "}
              <code className="font-mono text-[13px]">from</code>,{" "}
              <code className="font-mono text-[13px]">import</code> and{" "}
              <code className="font-mono text-[13px]">in</code>. Written as fields they are
              SyntaxErrors, so a generator that copies the key verbatim produces a file that cannot
              even be imported. The generator appends a trailing underscore —{" "}
              <code className="font-mono text-[13px]">class_</code>,{" "}
              <code className="font-mono text-[13px]">from_</code> — and records the real key in{" "}
              <code className="font-mono text-[13px]">Field(alias=...)</code>.
            </p>
            <p>
              Names the model base already owns get the same treatment. A JSON key of{" "}
              <code className="font-mono text-[13px]">model_config</code> would shadow Pydantic&apos;s
              own configuration attribute, and{" "}
              <code className="font-mono text-[13px]">self</code> collides with the first parameter
              of every method, so both become{" "}
              <code className="font-mono text-[13px]">model_config_</code> and{" "}
              <code className="font-mono text-[13px]">self_</code>.
            </p>
            <p>
              Renaming without the alias is the trap worth naming: Pydantic ignores unknown keys by
              default, so a document with <code className="font-mono text-[13px]">class</code> and a
              model expecting <code className="font-mono text-[13px]">class_</code> does not raise —
              the field is simply absent, and a required one fails with a message that points at the
              Python name you never sent.
            </p>
          </ContentSection>

          <ContentSection
            id="optional"
            title="Three states, and only one of them deserves a default"
          >
            <p>
              JSON distinguishes a key that is absent from a key that is present and null, and the
              generated models keep that distinction instead of flattening it:
            </p>
            <ProseList
              items={[
                "Present in every sampled record, never null → str, int, float: a plain required field.",
                "Present in every record, null in at least one → Optional[str] with no default. Pydantic still treats it as required, which is correct: the key must be there.",
                "Missing from at least one record → Optional[str] = None. This is the only case where the value may be absent entirely.",
              ]}
            />
            <p>
              The dataclass output carries an extra constraint the Pydantic one does not. Python
              evaluates default arguments in declaration order, and a dataclass raises{" "}
              <code className="font-mono text-[13px]">
                TypeError: non-default argument follows default argument
              </code>{" "}
              the moment the module is imported if a field with a default sits above a field without
              one. Since every optional field has{" "}
              <code className="font-mono text-[13px]">= None</code>, they are emitted last. The file
              imports cleanly; the field order simply stops matching the JSON.
            </p>
          </ContentSection>

          <ContentSection id="naming" title="snake_case fields, wire names preserved">
            <p>
              <code className="font-mono text-[13px]">orderId</code>,{" "}
              <code className="font-mono text-[13px]">orderID</code> and{" "}
              <code className="font-mono text-[13px]">order id</code> all become{" "}
              <code className="font-mono text-[13px]">order_id</code>. That is what PEP 8 asks for
              and what ruff&apos;s N815 enforces, and it is also how Python code reads in practice.
              Two keys that collapse onto the same name are suffixed, so a document carrying both{" "}
              <code className="font-mono text-[13px]">order id</code> and{" "}
              <code className="font-mono text-[13px]">order-id</code> keeps both fields.
            </p>
            <p>
              Pydantic needs two pieces to make the rename lossless:{" "}
              <code className="font-mono text-[13px]">Field(alias=&quot;orderId&quot;)</code> on the
              field, and <code className="font-mono text-[13px]">populate_by_name=True</code> in{" "}
              <code className="font-mono text-[13px]">model_config</code>. The alias alone makes the
              wire key the <em>only</em> accepted name, so{" "}
              <code className="font-mono text-[13px]">Order(order_id=1)</code> fails validation — a
              surprise when your own code, not an HTTP response, is the caller. Both are emitted
              together, and only for models that contain at least one alias.
            </p>
          </ContentSection>

          <ContentSection
            id="numbers"
            title="int is exact — but the trip through JSON is where precision is lost"
          >
            <p>
              Python integers have no fixed width, so a 19-digit order ID is stored exactly by the
              generated <code className="font-mono text-[13px]">int</code>. That is a real advantage
              over the TypeScript output, where the same value is a float64 and rounds.
            </p>
            <p>
              It does not rescue the tool, though, because the JSON text is parsed with{" "}
              <code className="font-mono text-[13px]">JSON.parse</code> before inference runs, and
              JavaScript stops being exact above 2<sup>53</sup>−1. An ID that long is already rounded
              by the time it reaches the generator. Keep identifiers above that limit as strings in
              the payload — the{" "}
              <Link
                href="/guides/why-json-numbers-lose-precision"
                className="text-blue-700 underline underline-offset-2"
              >
                precision guide
              </Link>{" "}
              walks through the arithmetic and the workarounds.
            </p>
            <p>
              Mixed numeric types follow the same policy as the other generators here: a field that
              held both whole and fractional numbers widens to{" "}
              <code className="font-mono text-[13px]">float</code>, and a field that held a number and
              a string becomes{" "}
              <code className="font-mono text-[13px]">Union[str, float]</code> rather than a guess.
            </p>
          </ContentSection>

          <ContentSection id="pro" title="DevTinyTools Pro">
            <p>
              The free generator handles the payloads most people paste by hand. Pro raises the
              per-document cap to {new Intl.NumberFormat("en-US").format(PYTHON_PRO_CHAR_LIMIT)}{" "}
              characters, which is roughly 10 MB of JSON — enough for a full API dump instead of a
              single response.
            </p>
            <ProseList items={PRO_FEATURES} />
            <p>
              Pro is {PRO_PRICE_LIFETIME} one-time — a lifetime licence, sold through Lemon Squeezy
              as merchant of record, so VAT and sales tax are handled for you. Pro is a licence key,
              not an account:{" "}
              {checkoutUrl ? (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 underline underline-offset-2"
                >
                  Buy DevTinyTools Pro
                </a>
              ) : (
                "checkout opens soon"
              )}
              , then activate it below and the higher limit unlocks in this browser.
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
          name: "JSON to Python Class Generator",
          url: absoluteUrl(PATH),
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript",
          description:
            "Generate Pydantic v2 models or dataclasses from JSON in the browser. Keyword keys are renamed with aliases, optional keys become Optional with a default, and nested models are declared children-first.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          isAccessibleForFree: true,
        }}
      />
    </>
  );
}
