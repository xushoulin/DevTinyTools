import { AdSlot } from "@/components/ad-slot";
import { ContentSection, ProseList, StepList } from "@/components/content-section";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { RelatedTools } from "@/components/related-tools";
import { LicenseDialog } from "@/components/license-dialog";
import { ToolPageHeader } from "@/components/tool-page-header";
import { JsonToGoTool } from "@/components/tools/json-to-go-tool";
import { pageMetadata } from "@/lib/metadata";
import { PRO_PRICE_LIFETIME, GO_PRO_CHAR_LIMIT, getProCheckoutUrl } from "@/lib/pro";
import { absoluteUrl } from "@/lib/site";

const PATH = "/json-to-go";

export const metadata = pageMetadata({
  title: "JSON to Go Struct Generator",
  description:
    "Generate Go structs from JSON with json tags, int64/float64 widths, pointers for null fields and omitempty for optional keys. Runs in your browser.",
  path: PATH,
});

const PRO_FEATURES = [
  <>
    <strong className="font-medium text-slate-900">
      Up to {new Intl.NumberFormat("en-US").format(GO_PRO_CHAR_LIMIT)} characters per
      document
    </strong>{" "}
    — a whole API dump in one paste instead of a hand-picked fragment of it.
  </>,
  <>
    <strong className="font-medium text-slate-900">Every generator this site ships</strong> —
    the same licence unlocks the Zod output on the TypeScript generator and the higher limits
    everywhere else, including tools added after you buy.
  </>,
  <>
    <strong className="font-medium text-slate-900">Lifetime licence</strong> — one payment,
    no subscription, and the tool keeps working after the next round of updates.
  </>,
];

const FAQ = [
  {
    question: "Why int64 instead of int?",
    answer:
      "Because int is 32 bits wide on 32-bit platforms and 64 bits on 64-bit ones, so the same struct that compiles and unmarshals on your laptop can silently fail on a GOARCH=386 build. API payloads routinely carry values beyond 2^31 — timestamps in milliseconds, snowflake IDs — so int64 is the width that does not depend on the target you happen to build for.",
  },
  {
    question: "Why are optional fields tagged omitempty instead of being pointers?",
    answer:
      "They answer different questions. omitempty says the key may be absent from the JSON; a pointer says the value may be null. A field that is sometimes absent but never null is correctly modelled by a plain string with ,omitempty. Making it a *string would compile and work, but it forces a nil check at every read for no gain — and it changes what you marshal back, because a nil pointer is omitted while an empty string is not.",
  },
  {
    question: "And the other way round — a field that is null but always present?",
    answer:
      "That one becomes a pointer, *string, with no ,omitempty. Go has no nullable string, and the zero value cannot tell you whether the API sent \"\" or null. A pointer can, and encoding/json unmarshals a JSON null into a nil pointer without complaining. This is why the generator keeps the two rules separate instead of collapsing both into pointers.",
  },
  {
    question: "Why do two different types in one field become any?",
    answer:
      "Go has no union type, so the alternatives are a guess or a lie. Picking string for a field that is sometimes a number loses data at unmarshal time — encoding/json returns an error and stops. `any` (Go 1.18+, an alias for interface{}) keeps the value unmarshalled and moves the type assertion to the call site, where you can actually decide what to do with it.",
  },
  {
    question: "How are field names chosen?",
    answer:
      "Exported PascalCase with Go's standard initialisms applied: id becomes ID, api_url becomes APIURL, user_id becomes UserID, uuid becomes UUID. The original key is preserved in the json tag, so no round-trip information is lost. Keys that are not valid identifiers — 2fa, user-name, keys with spaces — are turned into legal field names, and the tag keeps the real one.",
  },
  {
    question: "Why is the root array type called OrderItem instead of Order?",
    answer:
      "A root-level array needs two types: the element and the slice. With the root struct named Order you get type OrderItem struct and type Order []OrderItem, which reads correctly at every use site. Rename the root struct before generating and both names follow it.",
  },
  {
    question: "Do I get time.Time or time.Duration for dates and durations?",
    answer:
      "No, and that is deliberate: JSON has no date type, so an ISO-8601 value is a string and a duration is a number of unknown units. Guessing would produce code that fails to unmarshal the first time the API sends a slightly different format. Use string and convert at the boundary, or change the field to time.Time by hand once you know the exact layout.",
  },
  {
    question: "Is my JSON uploaded anywhere?",
    answer:
      "No. Parsing, inference and code generation all run in the tab. The file picker reads from disk with the FileReader API and nothing is sent over the network, which is what makes it safe to paste a production response or a customer's payload.",
  },
];

export default function JsonToGoPage() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ToolPageHeader
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Tools", href: "/#tools" },
            { label: "JSON to Go" },
          ]}
          title="JSON to Go Struct Generator"
          description="Paste a JSON response and get Go structs with json tags, int64 or float64 widths, pointers where the data was ever null and omitempty where a key was missing. Every array element is sampled, not just the first."
        />

        <div className="mt-6">
          <JsonToGoTool />
        </div>

        <AdSlot slot="toolBelow" />

        <div className="mt-12 space-y-10">
          <ContentSection id="how-to" title="How to generate Go structs from JSON">
            <StepList
              steps={[
                {
                  title: "Paste the JSON, or open a .json file",
                  body: "Paste the real response rather than a trimmed sample. An array of records is better than one record, because optionality and numeric widths are only visible when records disagree.",
                },
                {
                  title: "Name the root struct",
                  body: "Root is the default; use the type you will actually reference — Order, WebhookEvent, APIResponse. Nested types are named from it, so a short root keeps the child names short too.",
                },
                {
                  title: "Decide about ,omitempty and the package clause",
                  body: "The checkbox controls whether keys that were missing from some samples get ,omitempty. The package field is optional: leave it empty to paste the structs into an existing file, or type models to get a ready-to-save package.",
                },
                {
                  title: "Press Generate, then copy or download",
                  body: "The output is already column-aligned the way gofmt aligns it, so pasting it into your editor does not produce a diff. Download writes a .go file named after the root struct.",
                },
              ]}
            />
          </ContentSection>

          <ContentSection id="inference" title="What the generator decides, and why">
            <p>
              TypeScript has one number type and no null-safety distinction, so a JSON-to-TypeScript
              converter has little to decide. Go forces four decisions on every field, and getting
              them wrong produces code that compiles and then fails on real data:
            </p>
            <ProseList
              items={[
                <>
                  <strong className="font-medium text-slate-900">Numeric width.</strong>{" "}
                  Whole numbers become <code className="font-mono text-[12px]">int64</code>, and a
                  field with even one fractional sample widens to{" "}
                  <code className="font-mono text-[12px]">float64</code>. Widening on the first
                  decimal is the safe direction: an int64 field that receives{" "}
                  <code className="font-mono text-[12px]">19.5</code> fails to unmarshal, while a
                  float64 field that receives <code className="font-mono text-[12px]">4</code>{" "}
                  unmarshals to <code className="font-mono text-[12px]">4.0</code>.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Missing key → ,omitempty.</strong>{" "}
                  A key that at least one sampled element omitted is treated as optional. This is
                  the check every single-sample converter gets wrong, because the first element
                  cannot show you what it does not have.
                </>,
                <>
                  <strong className="font-medium text-slate-900">null → pointer.</strong> A value
                  that was ever null becomes{" "}
                  <code className="font-mono text-[12px]">*string</code>, so nil can represent it.
                  Slices, maps and any are already nil-able and are not double-wrapped into{" "}
                  <code className="font-mono text-[12px]">*[]string</code>.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Disagreeing kinds → any.</strong>{" "}
                  Go cannot express a union, so the honest fallback is{" "}
                  <code className="font-mono text-[12px]">any</code> — never a guess that discards
                  data at unmarshal time.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Nesting → named structs.</strong>{" "}
                  Each nested object is hoisted into its own declaration named after its path (
                  <code className="font-mono text-[12px]">OrderCustomer</code>,{" "}
                  <code className="font-mono text-[12px]">OrderItemsItem</code>) and referenced by
                  name, because anonymous structs become unreadable after two levels and cannot be
                  reused.
                </>,
              ]}
            />
          </ContentSection>

          <ContentSection id="optional-vs-nullable" title="Optional is not nullable — the tag decides which">
            <p>
              This is the part that trips up most Go code generated from JSON, and it is worth
              being precise about, because the two failures look identical until production.
            </p>
            <ProseList
              items={[
                <>
                  <strong className="font-medium text-slate-900">
                    <code className="font-mono text-[12px]">Name string `json:&quot;name,omitempty&quot;`</code>
                  </strong>{" "}
                  — the key may be absent. When you marshal, an empty string is dropped too, which
                  is the trap: if the API distinguishes{" "}
                  <code className="font-mono text-[12px]">&quot;&quot;</code> from a missing key,
                  omitempty will erase the difference on the way out.
                </>,
                <>
                  <strong className="font-medium text-slate-900">
                    <code className="font-mono text-[12px]">Coupon *string `json:&quot;coupon&quot;`</code>
                  </strong>{" "}
                  — the value may be null. nil and &quot;&quot; are distinguishable, so both
                  survive a round-trip. Use this when the API sends explicit nulls and you need to
                  tell &ldquo;no value&rdquo; from &ldquo;empty value&rdquo;.
                </>,
                <>
                  <strong className="font-medium text-slate-900">
                    <code className="font-mono text-[12px]">Code *string `json:&quot;code,omitempty&quot;`</code>
                  </strong>{" "}
                  — both. The generator emits this when a key is absent from some samples and null
                  in others, which is the only case where the two markers combine.
                </>,
              ]}
            />
            <p>
              If you need &ldquo;absent&rdquo; and &ldquo;zero&rdquo; to stay distinct in both
              directions, the reliable Go answer is a pointer or a wrapper type with an{" "}
              <code className="font-mono text-[12px]">IsSet</code> flag. The generator does not
              invent wrappers, because it cannot know which fields your business logic needs to
              tell apart — it picks the simplest type that round-trips the data it was shown.
            </p>
          </ContentSection>

          <ContentSection id="limits" title="Where generated structs stop being enough">
            <ProseList
              items={[
                <>
                  <strong className="font-medium text-slate-900">Dates and durations.</strong> JSON
                  has no date type. An ISO-8601 string is a string; converting it to{" "}
                  <code className="font-mono text-[12px]">time.Time</code> by hand is a one-line
                  change, and guessing is what breaks unmarshalling when the format shifts.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Enums.</strong> A status field that
                  is only ever <code className="font-mono text-[12px]">&quot;paid&quot;</code> in
                  your sample becomes string. Define a named string type and its constants once you
                  know the allowed values.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Large integers.</strong>{" "}
                  <code className="font-mono text-[12px]">encoding/json</code> decodes numbers into
                  float64 unless the target is an integer type, so an ID beyond 2^53 has already
                  lost precision in JavaScript — but in Go an int64 field is exact. Keep monetary
                  values out of float64 regardless: use a string or a decimal type.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Discriminated unions.</strong>{" "}
                  Payloads shaped as{" "}
                  <code className="font-mono text-[12px]">{`{"type": "card", "last4": "4242"}`}</code>{" "}
                  versus different fields per variant become any on the differing members. Model
                  those with a custom{" "}
                  <code className="font-mono text-[12px]">UnmarshalJSON</code> once you know the
                  variants.
                </>,
                <>
                  <strong className="font-medium text-slate-900">Validation.</strong> Nothing here
                  emits <code className="font-mono text-[12px]">validate:&quot;required&quot;</code>{" "}
                  tags or <code className="font-mono text-[12px]">binding</code> tags. Those encode
                  business rules the sample cannot tell you.
                </>,
              ]}
            />
          </ContentSection>

          <ContentSection id="pro" title="DevTinyTools Pro">
            <p>
              Generating Go structs is free and stays free. Pro is for the workflows that outgrow a
              single paste:
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
          name: "JSON to Go Struct Generator",
          url: absoluteUrl(PATH),
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript",
          description:
            "Generate Go structs from a JSON sample with json tags, int64 and float64 widths, pointers for null values and omitempty for optional keys.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          isAccessibleForFree: true,
        }}
      />
    </>
  );
}
