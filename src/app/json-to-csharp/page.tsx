import { AdSlot } from "@/components/ad-slot";
import Link from "next/link";
import { ContentSection, ProseList, StepList } from "@/components/content-section";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { RelatedTools } from "@/components/related-tools";
import { LicenseDialog } from "@/components/license-dialog";
import { ToolPageHeader } from "@/components/tool-page-header";
import { JsonToCsharpTool } from "@/components/tools/json-to-csharp-tool";
import { pageMetadata } from "@/lib/metadata";
import { CSHARP_PRO_CHAR_LIMIT, PRO_PRICE_LIFETIME, getProCheckoutUrl } from "@/lib/pro";
import { absoluteUrl } from "@/lib/site";

const PATH = "/json-to-csharp";

export const metadata = pageMetadata({
  title: "JSON to C# Class Generator",
  description:
    "Generate C# classes from JSON with #nullable enable, nullable annotations from every record, CS8618-safe initialisers and [JsonPropertyName] on each key.",
  path: PATH,
});

const FAQ = [
  {
    question: "Why does the output start with #nullable enable?",
    answer:
      "Because the optionality inferred from your sample is worthless unless the compiler enforces it. With nullable annotations on, string? means the key may be absent or null, and the compiler warns you when you dereference it without checking. Without that switch, string? is a comment: every reference type quietly accepts null and you find out at runtime.",
  },
  {
    question: "Why are some numbers long? and others long?",
    answer:
      "A whole number that every sampled record carried is a plain long. If any record omitted the key or sent null, the property becomes long? — a Nullable<long>, which is how C# represents an absent value type without boxing. The generator decides from every array element, not just the first, because a single record makes everything look required.",
  },
  {
    question: "Why is [JsonPropertyName] on almost every property?",
    answer:
      "System.Text.Json matches property names case-sensitively by default, so a JSON key of total will not bind to a C# property named Total without help. Since the C# convention is PascalCase and JSON is usually camelCase or snake_case, the annotation is emitted wherever the exact spelling differs. Turn the checkbox off if you configure PropertyNameCaseInsensitive or use a naming policy that already handles it.",
  },
  {
    question: "Why do properties have = string.Empty; or = new();?",
    answer:
      "A non-nullable reference property that nobody initialises triggers compiler warning CS8618, and warnings-as-errors turns that into a failed build. Required strings get string.Empty, required lists and nested classes get new(); required value types need nothing because their default is valid. The file is then warning-free without any behaviour change — System.Text.Json overwrites the values during deserialisation.",
  },
  {
    question: "Does it work with Newtonsoft.Json instead of System.Text.Json?",
    answer:
      "Yes. Newtonsoft honours [JsonPropertyName] from System.Text.Json, but if you drop the annotation, add [JsonProperty] with the same key instead — Newtonsoft is case-insensitive by default, so plain camelCase properties often bind without any attribute at all.",
  },
  {
    question: "Can I get records instead of classes?",
    answer:
      "Not yet. Records with positional parameters need a constructor signature that matches the JSON exactly, and a missing optional key then becomes a constructor argument problem rather than a property one. Classes with get; set; deserialise reliably under both serialisers, and converting a small class to a record afterwards is a one-line edit.",
  },
  {
    question: "What happens when a key is sometimes a string and sometimes a number?",
    answer:
      "It becomes object, which System.Text.Json deserialises into a JsonElement — you then read it with GetString() or GetInt64() where you consume it. C# has no union types, and picking one of the two would make deserialisation fail on the other shape.",
  },
  {
    question: "Is my JSON uploaded anywhere?",
    answer:
      "No. Parsing, inference and code generation all run in this tab. The file picker uses FileReader, and no network request is made while generating — you can verify that in your browser's network panel.",
  },
];

const PRO_FEATURES = [
  `${new Intl.NumberFormat("en-US").format(CSHARP_PRO_CHAR_LIMIT)}-character documents, roughly 10 MB of JSON`,
  "The same Pro licence unlocks every tool on the site — TypeScript, Go, Java, schemas, batch ZIP export",
  "Priority fixes — generation bugs move to the front of the queue",
];

export default function JsonToCsharpPage() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ToolPageHeader
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Tools", href: "/#tools" },
            { label: "JSON to C#" },
          ]}
          title="JSON to C# Class Generator"
          description="Turn a JSON response into C# classes that deserialise on the first try: nullable annotations computed from every record, initialisers that keep the build warning-free, and [JsonPropertyName] wherever C# naming disagrees with the wire."
        />

        <div className="mt-6">
          <JsonToCsharpTool />
        </div>

        <AdSlot slot="toolBelow" />

        <div className="mt-12 space-y-10">
          <ContentSection id="how-to" title="How to generate C# classes from JSON">
            <StepList
              steps={[
                {
                  title: "Paste a JSON object or array",
                  body: "or load the example: two orders whose item lists disagree, which is exactly where single-sample generators get it wrong.",
                },
                {
                  title: "Name the root class and the namespace",
                  body: "The root name becomes the first class and the file name. The namespace is optional — leave it blank for a snippet you paste into an existing project.",
                },
                {
                  title: "Choose the serialiser style",
                  body: "System.Text.Json attributes are on by default. Turn them off if you already configure PropertyNameCaseInsensitive or use a naming policy.",
                },
                {
                  title: "Copy or download the .cs file",
                  body: "Every class is in one file, all top-level, so it compiles as-is in any project that targets .NET 6 or newer.",
                },
              ]}
            />
          </ContentSection>

          <ContentSection
            id="nullable"
            title="Nullable reference types: the switch that decides whether this compiles cleanly"
          >
            <p>
              C# has two kinds of null, and JSON only has one. A reference type{" "}
              (<code className="font-mono text-[12px]">string</code>,{" "}
              <code className="font-mono text-[12px]">List&lt;T&gt;</code>, your own classes) is
              nullable by nature; a value type (<code className="font-mono text-[12px]">long</code>,{" "}
              <code className="font-mono text-[12px]">bool</code>) is not. Since C# 8 the compiler
              can track that difference for you — but only inside a nullable annotations context,
              which is why the generated file starts with{" "}
              <code className="font-mono text-[12px]">#nullable enable</code> whenever a{" "}
              <code className="font-mono text-[12px]">?</code> is actually emitted.
            </p>
            <ProseList
              items={[
                <>
                  <strong className="font-medium text-slate-900">Key in every record → non-nullable.</strong>{" "}
                  <code className="font-mono text-[12px]">public string Email {"{ get; set; }"} =
                  string.Empty;</code> — dereference it freely, and the serialiser fails loudly if
                  the API ever stops sending it.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Key missing or null → `?`.</strong>{" "}
                  <code className="font-mono text-[12px]">public string? CouponCode {"{ get; set; }"}</code>{" "}
                  or <code className="font-mono text-[12px]">public long? Quantity {"{ get; set; }"}</code>.
                  The compiler now forces a null check before use, which is the only reason the
                  annotation is worth writing.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Initialisers keep the build green.</strong>{" "}
                  Without them, every non-nullable reference property produces CS8618 and a project
                  with warnings-as-errors refuses to build. The values are overwritten during
                  deserialisation, so they cost nothing at runtime.
                </>,
              ]}
            />
            <p>
              This is the part most converters skip. They emit{" "}
              <code className="font-mono text-[12px]">public string CouponCode {"{ get; set; }"}</code>{" "}
              for a key that was null half the time, the project compiles with 40 warnings, and the
              first missing field throws a{" "}
              <code className="font-mono text-[12px]">NullReferenceException</code> three layers
              away from the JSON. The types here come from sampling <em>every</em> array element, so
              &ldquo;optional&rdquo; is a fact about your data rather than a guess.
            </p>
          </ContentSection>

          <ContentSection id="names" title="Names: PascalCase in C#, snake_case on the wire">
            <p>
              C# convention says <code className="font-mono text-[12px]">CouponCode</code>; the API
              says <code className="font-mono text-[12px]">coupon_code</code>. Both names have to
              survive, and System.Text.Json is case-sensitive by default — even{" "}
              <code className="font-mono text-[12px]">total</code> will not bind to{" "}
              <code className="font-mono text-[12px]">Total</code> without help. So the generator
              annotates every property whose exact spelling differs:
            </p>
            <ProseList
              items={[
                <>
                  <code className="font-mono text-[12px]">[JsonPropertyName(&quot;coupon_code&quot;)]</code>{" "}
                  above <code className="font-mono text-[12px]">public string CouponCode</code>.
                </>,
                <>
                  Keys that start with a digit get a prefix (
                  <code className="font-mono text-[12px]">2fa_enabled</code> →{" "}
                  <code className="font-mono text-[12px]">Field2faEnabled</code>), because a C#
                  identifier cannot start with a number.
                </>,
                <>
                  Two keys that collapse onto the same C# name (
                  <code className="font-mono text-[12px]">user_id</code> and{" "}
                  <code className="font-mono text-[12px]">userId</code>) are deduplicated as{" "}
                  <code className="font-mono text-[12px]">UserId</code> /{" "}
                  <code className="font-mono text-[12px]">UserId2</code>, each keeping its own
                  annotation — silently dropping one field is the alternative, and it loses data.
                </>,
              ]}
            />
          </ContentSection>

          <ContentSection id="structure" title="One file, every class top-level">
            <p>
              C# allows many classes per file, so unlike the Java output there is no need to nest
              them: nested objects and array elements become sibling classes named after their
              path — <code className="font-mono text-[12px]">Order</code> →{" "}
              <code className="font-mono text-[12px]">OrderCustomer</code> →{" "}
              <code className="font-mono text-[12px]">OrderItems</code>. Arrays map to{" "}
              <code className="font-mono text-[12px]">List&lt;T&gt;</code> rather than{" "}
              <code className="font-mono text-[12px]">T[]</code>, because that is what
              System.Text.Json and most C# code expect to iterate.
            </p>
            <p>
              Integers become <code className="font-mono text-[12px]">long</code>, not{" "}
              <code className="font-mono text-[12px]">int</code>: 32 bits overflow on timestamps in
              milliseconds and on totals in cents. Narrowing a field you know is small is a safe
              manual edit. Floats become{" "}
              <code className="font-mono text-[12px]">double</code>, and mixed number/string fields
              become <code className="font-mono text-[12px]">object</code> — money should not be a
              double at all, which the{" "}
              <Link
                href="/guides/why-json-numbers-lose-precision"
                className="text-blue-700 underline underline-offset-2"
              >
                precision guide
              </Link>{" "}
              explains with the decimal argument.
            </p>
            <p>
              None of this is better than the sample it was inferred from: one record makes every
              key look required. The reasoning is laid out in{" "}
              <Link
                href="/guides/generate-typescript-types-from-json"
                className="text-blue-700 underline underline-offset-2"
              >
                your sample is not a schema
              </Link>
              , and it holds for C# as much as for TypeScript. For the parts specific to
              System.Text.Json — what <code className="font-mono text-[12px]">required</code> adds
              over <code className="font-mono text-[12px]">#nullable enable</code>, and why a
              mixed-type field becomes a JsonElement — read{" "}
              <Link
                href="/guides/convert-json-to-csharp-class"
                className="text-blue-700 underline underline-offset-2"
              >
                nullable annotations, CS8618 and JsonElement
              </Link>
              .
            </p>
          </ContentSection>

          <ContentSection id="pro" title="DevTinyTools Pro">
            <p>
              The free generator handles the payloads most people paste by hand. Pro raises the
              document cap and unlocks every other tool on the site:
            </p>
            <ProseList items={PRO_FEATURES} />
            <p>
              Pro is {PRO_PRICE_LIFETIME} one-time — a lifetime licence, sold through Lemon Squeezy
              as merchant of record, so VAT and sales tax are handled for you. Pro is a licence key
              — there is still no account.{" "}
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
          name: "JSON to C# Class Generator",
          url: absoluteUrl(PATH),
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript",
          description:
            "Generate C# classes from JSON in the browser. Nullable annotations come from sampling every record, initialisers avoid CS8618, and [JsonPropertyName] keeps the wire names.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          isAccessibleForFree: true,
        }}
      />
    </>
  );
}
