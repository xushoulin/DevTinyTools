import { AdSlot } from "@/components/ad-slot";
import Link from "next/link";
import { ContentSection, ProseList, StepList } from "@/components/content-section";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { RelatedTools } from "@/components/related-tools";
import { LicenseDialog } from "@/components/license-dialog";
import { ToolPageHeader } from "@/components/tool-page-header";
import { JsonToJavaTool } from "@/components/tools/json-to-java-tool";
import { pageMetadata } from "@/lib/metadata";
import { JAVA_PRO_CHAR_LIMIT, PRO_PRICE_LIFETIME, getProCheckoutUrl } from "@/lib/pro";
import { absoluteUrl } from "@/lib/site";

const PATH = "/json-to-java";

export const metadata = pageMetadata({
  title: "JSON to Java POJO Generator",
  description:
    "Generate Java classes from JSON: primitives where a value is required, boxed types where it can be null, @JsonProperty for snake_case keys.",
  path: PATH,
});

const FAQ = [
  {
    question: "Why are some fields long and others Long?",
    answer:
      "A primitive long cannot hold null, so a field that is missing from some records or null in any of them is declared as the wrapper Long. Required whole numbers stay primitive to avoid pointless boxing; the same rule applies to boolean versus Boolean and double versus Double.",
  },
  {
    question: "Why does the generator add @JsonProperty?",
    answer:
      "Because Java naming and JSON naming rarely agree. coupon_code becomes couponCode for the field, and the annotation keeps the wire name so Jackson still finds it. Without the annotation the field would silently stay null, which is the failure mode this tool exists to prevent. Turn Jackson off if you use Gson or a mapper that reads field names only — the JSON key is then kept as a comment.",
  },
  {
    question: "Why are the nested classes inside the root class?",
    answer:
      "Java allows one public top-level class per file, so a document with four nested objects would become five files. Emitting them as public static nested classes keeps the whole document in one compilable file; promote them to top-level classes later if you prefer.",
  },
  {
    question: "What happens to a key that is sometimes a string and sometimes a number?",
    answer:
      "It becomes Object. Java has no union types, and picking one of the two would make deserialisation fail at runtime with a confusing error. Object is honest: you will handle the type check where you read the value.",
  },
  {
    question: "Can I use this with Gson, Moshi or kotlinx.serialization?",
    answer:
      "Yes for Gson and Moshi, with the Jackson checkbox off: the field names alone will not match snake_case keys, so keep the comments as a reminder or configure a field naming policy such as LOWER_CASE_WITH_UNDERSCORES. kotlinx.serialization needs Kotlin data classes, which is a different output.",
  },
  {
    question: "Are records or Lombok supported?",
    answer:
      "Not yet. Java records cannot express mutable POJOs with optional fields cleanly, and Lombok would add a compile-time dependency the generated file cannot guarantee. Plain fields with getters and setters compile everywhere — turn the accessors toggle off if your mapper sets fields directly.",
  },
  {
    question: "What about dates and enums?",
    answer:
      "JSON has neither, so an ISO-8601 string stays String and a status field stays String. Typing it as LocalDateTime or an enum would be a guess from one sample; both are five-line edits after generation, and safer done by hand.",
  },
  {
    question: "Is my JSON uploaded?",
    answer:
      "No. Parsing, inference and code generation run in the tab. The file picker uses FileReader, and no request is made during generation — you can confirm that in the network panel.",
  },
];

const PRO_FEATURES = [
  `${new Intl.NumberFormat("en-US").format(JAVA_PRO_CHAR_LIMIT)}-character documents, roughly 10 MB of JSON`,
  "The same Pro licence unlocks every tool on the site — TypeScript, Go, schemas, batch ZIP export",
  "Priority fixes — generation bugs move to the front of the queue",
];

export default function JsonToJavaPage() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ToolPageHeader
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Tools", href: "/#tools" },
            { label: "JSON to Java" },
          ]}
          title="JSON to Java POJO Generator"
          description="Turn a JSON response into Java classes that actually deserialise: primitives where a value is required, wrappers where it is optional or null, @JsonProperty for keys Java cannot name, and nested objects as static classes."
        />

        <div className="mt-6">
          <JsonToJavaTool />
        </div>

        <AdSlot slot="toolBelow" />

        <div className="mt-12 space-y-10">
          <ContentSection id="how-to" title="How to generate Java classes from JSON">
            <StepList
              steps={[
                {
                  title: "Paste a JSON object or array",
                  body: "or load the example: two orders whose keys disagree on nullability, which is where most generated POJOs break.",
                },
                {
                  title: "Name the root and set the package",
                  body: "The root name becomes the public class and the file name. The package is optional — leave it blank for a snippet.",
                },
                {
                  title: "Choose the mapping style",
                  body: "Jackson annotations on by default, getters and setters on by default, 2 or 4 space indent. All three change the output live.",
                },
                {
                  title: "Copy or download the .java file",
                  body: "One file with every nested class. Drop it into src/main/java and run your mapper against the same payload you pasted.",
                },
              ]}
            />
          </ContentSection>

          <ContentSection id="boxed" title="Primitive or wrapper: the decision that decides whether it parses">
            <p>
              Java&rsquo;s type system forces a choice that JSON does not: a{" "}
              <code className="font-mono text-[12px]">long</code> cannot hold null. Every field
              therefore has to answer &ldquo;can this be absent?&rdquo; before it can be declared,
              and getting it wrong produces the classic failure — a{" "}
              <code className="font-mono text-[12px]">NullPointerException</code> on a field the
              sample never showed as missing, or a silently zeroed primitive.
            </p>
            <ProseList
              items={[
                <>
                  <strong className="font-medium text-slate-900">Present in every sample →
                  primitive.</strong>{" "}
                  <code className="font-mono text-[12px]">long total</code>. No boxing, no null
                  checks, and the mapper fails loudly if the API ever stops sending it.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Missing from any sample → wrapper.</strong>{" "}
                  <code className="font-mono text-[12px]">Long total</code>. The distinction comes
                  from sampling every array element, not just the first: paste a single record and
                  every field looks required.
                </>,
                <>
                  <strong className="font-medium text-slate-900">ever null → wrapper.</strong>{" "}
                  <code className="font-mono text-[12px]">Double discount</code> for a field that
                  held <code className="font-mono text-[12px]">null</code> in one record. A primitive
                  cannot represent that, and Jackson will throw on the null rather than coerce it.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Generics are always boxed.</strong>{" "}
                  <code className="font-mono text-[12px]">List&lt;Long&gt;</code>, never{" "}
                  <code className="font-mono text-[12px]">List&lt;long&gt;</code> — Java generics only
                  accept reference types, which is a compile error waiting for anyone who tries.
                </>,
              ]}
            />
            <p>
              The same rule decides <code className="font-mono text-[12px]">boolean</code> versus{" "}
              <code className="font-mono text-[12px]">Boolean</code> and{" "}
              <code className="font-mono text-[12px]">double</code> versus{" "}
              <code className="font-mono text-[12px]">Double</code>. Whole numbers get{" "}
              <code className="font-mono text-[12px]">long</code> rather than{" "}
              <code className="font-mono text-[12px]">int</code> because 32 bits overflow on
              timestamps and totals; if you know a field is small, narrowing it is a safe manual
              edit. Floats are <code className="font-mono text-[12px]">double</code>, never{" "}
              <code className="font-mono text-[12px]">float</code>, and money should not be a
              double at all — see the{" "}
              <Link
                href="/guides/why-json-numbers-lose-precision"
                className="text-blue-700 underline underline-offset-2"
              >
                precision guide
              </Link>{" "}
              for the BigDecimal argument.
            </p>
          </ContentSection>

          <ContentSection id="names" title="Names: the part JSON and Java refuse to share">
            <p>
              <code className="font-mono text-[12px]">coupon_code</code> is not a legal Java
              convention, so the field becomes{" "}
              <code className="font-mono text-[12px]">couponCode</code> — and now the mapper cannot
              find it. The wire name has to be preserved explicitly:
            </p>
            <ProseList
              items={[
                <>
                  <strong className="font-medium text-slate-900">With Jackson on (default):</strong>{" "}
                  <code className="font-mono text-[12px]">@JsonProperty(&quot;coupon_code&quot;)</code>{" "}
                  sits directly above the field, so both names survive.
                </>,
                <>
                  <strong className="font-medium text-slate-900">With Jackson off:</strong> the key is
                  kept as a trailing comment,{" "}
                  <code className="font-mono text-[12px]">private String couponCode; // json:
                  coupon_code</code>. Pick a mapper that can be configured with a naming policy, or
                  turn the annotation back on.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Keys that break the rules:</strong>{" "}
                  a key starting with a digit gets a <code className="font-mono text-[12px]">field</code>{" "}
                  prefix (<code className="font-mono text-[12px]">2fa_enabled</code> →{" "}
                  <code className="font-mono text-[12px]">field2faEnabled</code>), because an
                  identifier cannot start with a number.
                </>,
              ]}
            />
          </ContentSection>

          <ContentSection id="structure" title="One file, nested static classes">
            <p>
              A JSON document with four nested objects could become five Java files, since only one
              public top-level class is allowed per file. This generator takes the other route:
              nested objects become{" "}
              <code className="font-mono text-[12px]">public static class</code> declarations inside
              the root. The result is one file you can paste and compile, with types named after
              their path — <code className="font-mono text-[12px]">Order</code> →{" "}
              <code className="font-mono text-[12px]">OrderCustomer</code> →{" "}
              <code className="font-mono text-[12px]">OrderItems</code>.
            </p>
            <p>
              When the root of the document is an array, the file models one element and says so in
              a comment: Java needs a class, and inventing a wrapper object the API never sends
              would be worse than a comment explaining{" "}
              <code className="font-mono text-[12px]">List&lt;Order&gt;</code>.
            </p>
            <p>
              Every one of these decisions is only as good as the sample behind it: paste one
              record and nothing looks optional. The argument is laid out in{" "}
              <Link
                href="/guides/generate-typescript-types-from-json"
                className="text-blue-700 underline underline-offset-2"
              >
                your sample is not a schema
              </Link>
              , and it applies to Java unchanged. For the parts that are Jackson-specific — primitive
              versus boxed, null versus absent, records and nested classes — read{" "}
              <Link
                href="/guides/convert-json-to-java-pojo"
                className="text-blue-700 underline underline-offset-2"
              >
                primitive or boxed, and why it matters
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
          name: "JSON to Java POJO Generator",
          url: absoluteUrl(PATH),
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript",
          description:
            "Generate Java POJO classes from JSON in the browser. Required fields stay primitive, optional and nullable ones become boxed, and snake_case keys get @JsonProperty.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          isAccessibleForFree: true,
        }}
      />
    </>
  );
}
