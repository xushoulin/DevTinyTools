import Link from "next/link";
import {
  CodeBlock,
  ContentSection,
  InlineCode,
  ProseList,
} from "@/components/content-section";
import { FaqSection } from "@/components/faq-section";
import { GuideShell } from "@/components/guide-shell";
import { getGuide } from "@/lib/guides";
import { pageMetadata } from "@/lib/metadata";

const SLUG = "convert-json-to-csharp-class";
const guide = getGuide(SLUG)!;

export const metadata = pageMetadata({
  // Short enough for the 60-character budget once the site suffix is added.
  title: "JSON to C#: nullable, CS8618, JsonElement",
  description: guide.description,
  path: guide.href,
});

const GENERATED = `#nullable enable

public class Order
{
    public long Id { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public string? CouponCode { get; set; }
}`;

const ABSENT_PROBLEM = `// The server omitted "status" entirely.
var order = JsonSerializer.Deserialize<Order>(json)!;

// Reads as "", the initialiser value. This branch is wrong:
// it treats "the field was never sent" as "the server sent an empty string".
if (order.Status == "")
{
    Console.WriteLine("no status");
}`;

const WITH_REQUIRED = `#nullable enable

public class Order
{
    public long Id { get; set; }
    public required string Status { get; set; }
    public decimal Total { get; set; }
    public string? CouponCode { get; set; }
}`;

const CASING_MATRIX = [
  {
    key: "total",
    property: "Total",
    plain: "Not bound — property stays 0",
    attribute: "Bound",
    policy: "Bound by CamelCase policy",
  },
  {
    key: "order_id",
    property: "OrderId",
    plain: "Not bound — property stays 0",
    attribute: "Bound",
    policy: "Not bound by CamelCase; needs SnakeCaseLower (.NET 8+) or a custom policy",
  },
  {
    key: "Total",
    property: "Total",
    plain: "Bound",
    attribute: "Bound",
    policy: "Bound",
  },
  {
    key: "couponCode",
    property: "CouponCode",
    plain: "Not bound — stays null",
    attribute: "Bound",
    policy: "Bound",
  },
];

const DISPOSED = `public class Order
{
    public long Id { get; set; }
    // object becomes JsonElement at runtime: a live view into a document.
    public object? Metadata { get; set; }
}

using var doc = JsonDocument.Parse(json);
var order = new Order
{
    Id = 1,
    Metadata = doc.RootElement.GetProperty("metadata"),
};

// doc is disposed at the end of the using block...
order.Metadata.ToString();   // ObjectDisposedException: The JsonDocument has been disposed.`;

const CLONED = `// Detach the value from its document before storing it.
Metadata = doc.RootElement.GetProperty("metadata").Clone();

// Or model it properly, which skips JsonElement altogether.
public JsonNode? Metadata { get; set; }`;

const RECORD = `// Positional record: compact, but every parameter is filled with default(T)
// when its key is absent — including the ones annotated as non-nullable.
public record Order(long Id, string Status, decimal Total, string? CouponCode);`;

const ROUND_TRIP = `[Fact]
public void RoundTripsThePayload()
{
    const string raw = """
        { "id": 84126, "status": "paid", "total": 19.50, "coupon_code": null }
        """;

    var order = JsonSerializer.Deserialize<Order>(raw)!;
    Assert.Equal("paid", order.Status);
    Assert.Null(order.CouponCode);

    var before = JsonNode.Parse(raw)!;
    var after = JsonSerializer.SerializeToNode(order)!;

    // DeepEquals compares structure and values, not formatting.
    Assert.True(JsonNode.DeepEquals(before, after));
}`;

const FAQ = [
  {
    question: "Why do properties have = string.Empty; in the generated file?",
    answer:
      "A non-nullable reference property that nobody initialises triggers compiler warning CS8618, and a project with warnings-as-errors turns that into a failed build. The initialiser silences it without changing behaviour on a successful bind, because System.Text.Json overwrites the value as soon as the key is present. The cost is that the default becomes indistinguishable from a real empty string when the key is absent — which is the subject of the first section of this guide.",
  },
  {
    question: "How is required different from #nullable enable?",
    answer:
      "Nullable annotations are a compile-time promise about what your code does; they are not a runtime contract about what the JSON contains. The required modifier is the runtime half: System.Text.Json fails the deserialisation with a JsonException naming the missing properties instead of leaving a default in place. Use required for keys the API contract guarantees, and string? for the ones that may legitimately be absent.",
  },
  {
    question: "Why does the JSON key total not bind to the property Total?",
    answer:
      "System.Text.Json matches property names case-sensitively by default, and Total is not total. Three things fix it: [JsonPropertyName(\"total\")], JsonSerializerOptions.PropertyNameCaseInsensitive = true, or a naming policy such as JsonNamingPolicy.CamelCase. The policy is the tidiest for a whole API; the attribute is the only one that survives someone reading a single class in isolation, which is why generated files use it.",
  },
  {
    question: "Does a naming policy handle snake_case keys too?",
    answer:
      "Only from .NET 8, which added JsonNamingPolicy.SnakeCaseLower and SnakeCaseUpper. On earlier versions a policy cannot express it, and the converter approach (a custom JsonNamingPolicy subclass) is more code than one attribute per field. The generated file therefore spells every divergent key out with [JsonPropertyName], which works on every supported version.",
  },
  {
    question: "Why did my object-typed property throw 'The JsonDocument has been disposed'?",
    answer:
      "Because object does not become a dictionary or a string at runtime — when the source is a JSON object or array it becomes a JsonElement, which is a view into the JsonDocument that produced it. If that document was created with JsonDocument.Parse and disposed, every element obtained from it becomes invalid. Clone the element, store a JsonNode instead, or model the shape with a real class.",
  },
  {
    question: "Should money be decimal or double?",
    answer:
      "decimal. double is a binary floating-point type, so 0.1 + 0.2 is not 0.3 and totals drift as soon as you sum them; decimal is base-10 and exact for the values money is written in. A generator emits double because a JSON number carries no units, but every field that holds a price should be changed to decimal by hand. If the payload sends prices as strings, add [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)].",
  },
  {
    question: "Can a positional record be deserialised, and what happens to missing keys?",
    answer:
      "Yes, System.Text.Json binds records through their constructor. But a record parameter has no initialiser, so an absent key passes default(T) — null for a string, 0 for a long — even when the parameter is annotated non-nullable. Nullable reference types do not protect that path. If absence must fail, use required properties on a class, or validate the record after construction.",
  },
  {
    question: "How are enums handled?",
    answer:
      "As numbers, by default: a JSON string will not bind to an enum property unless you register JsonStringEnumConverter. Add it once in JsonSerializerOptions.Converters and string values bind case-insensitively. An unknown string still throws, so if the API may add members later, either keep the field as a string or add a fallback member and a converter that maps unknown values to it.",
  },
];

export default function Page() {
  return (
    <GuideShell guide={guide}>
      <ContentSection id="missing" title="The dangerous default is not a warning, it is a value">
        <p>
          A generated class file under <InlineCode>#nullable enable</InlineCode> compiles
          cleanly, which is exactly what makes the next problem easy to miss:
        </p>
        <CodeBlock>{GENERATED}</CodeBlock>
        <p>
          Every non-nullable reference property has an initialiser, so the compiler has
          nothing to complain about. Then the endpoint omits{" "}
          <InlineCode>status</InlineCode>, and the deserialiser simply does not touch the
          property:
        </p>
        <CodeBlock>{ABSENT_PROBLEM}</CodeBlock>
        <p>
          Three different documents — key absent, key present as{" "}
          <InlineCode>{`""`}</InlineCode>, key present with text — produce two
          indistinguishable outcomes. The initialiser that silenced CS8618 also created a
          value that looks like data. This is the C# face of a problem every typed language
          in this series runs into: the generated model is a hypothesis about the payload,
          and the default is the part of the hypothesis that fails silently.
        </p>
      </ContentSection>

      <ContentSection id="required" title="required is the runtime half of the contract">
        <p>
          Nullable reference types are a compile-time analysis of <em>your</em> code. They
          say nothing about what a JSON document contains, and{" "}
          <InlineCode>JsonSerializer</InlineCode> does not consult them when binding. The{" "}
          <InlineCode>required</InlineCode> modifier is the part that System.Text.Json does
          enforce:
        </p>
        <CodeBlock>{WITH_REQUIRED}</CodeBlock>
        <p>
          With that modifier, a payload missing <InlineCode>status</InlineCode> fails with a{" "}
          <InlineCode>JsonException</InlineCode> that names the missing properties, instead
          of handing you an object that quietly answers{" "}
          <InlineCode>{`""`}</InlineCode>. That is the difference between a bug you find in
          a test and a bug you find in a report — and it is why{" "}
          <InlineCode>required</InlineCode>, not the initialiser, is what the field actually
          needed.
        </p>
        <ProseList
          items={[
            <>
              <strong className="font-medium text-slate-900">Use required for guaranteed
              keys.</strong>{" "}
              Anything the API promises to send on every response. The failure is then loud
              and immediate.
            </>,
            <>
              <strong className="font-medium text-slate-900">Use string? for genuinely
              optional keys.</strong>{" "}
              Then <InlineCode>null</InlineCode> means &ldquo;not sent&rdquo; and the
              compiler makes you check before dereferencing — which is the whole point.
            </>,
            <>
              <strong className="font-medium text-slate-900">Do not mix them on one
              property.</strong>{" "}
              A nullable property with a non-null default is the combination that produces
              the invisible empty string.
            </>,
          ]}
        />
        <p>
          The generator emits <InlineCode>required</InlineCode>-free classes on purpose: it
          cannot tell a key that is always present from a key it happened to see in every
          sample. Adding the modifier is a one-word edit per field, and it is the highest
          value edit in the file.
        </p>
      </ContentSection>

      <ContentSection id="casing" title="Binding is exact by default, and casing counts">
        <p>
          System.Text.Json matches property names with{" "}
          <InlineCode>StringComparison.Ordinal</InlineCode>:{" "}
          <InlineCode>total</InlineCode> and <InlineCode>Total</InlineCode> are different
          names. Since the C# convention is PascalCase and JSON keys are usually camelCase
          or snake_case, the exact-spelling rule surprises people on the first response
          they try:
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-[13px]">
            <caption className="sr-only">
              Whether each JSON key binds under three configurations
            </caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-3 py-2 font-semibold">
                  JSON key
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Property
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Default options
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  [JsonPropertyName]
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  CamelCase policy
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {CASING_MATRIX.map((row) => (
                <tr key={row.key}>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-slate-800">
                    {row.key}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-slate-800">
                    {row.property}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{row.plain}</td>
                  <td className="px-3 py-2.5 text-slate-600">{row.attribute}</td>
                  <td className="px-3 py-2.5 text-slate-600">{row.policy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          The middle column of the first row is the failure worth recognising: nothing
          throws, the property keeps its default, and the object looks valid. A policy is
          the tidiest fix for a whole API surface, but it only covers the case-convention
          mismatch — snake_case needs .NET 8&rsquo;s{" "}
          <InlineCode>SnakeCaseLower</InlineCode>, and irregular keys need the attribute
          regardless. Emitting{" "}
          <InlineCode>[JsonPropertyName]</InlineCode> wherever the spelling differs is the
          version that works on every supported runtime and survives being copied into a
          single file.
        </p>
      </ContentSection>

      <ContentSection id="element" title="A mixed-type field is a JsonElement with a lifetime">
        <p>
          When a key holds a string in one record and a number in another, no CLR type fits
          and the generated class uses <InlineCode>object</InlineCode>. At runtime that
          property is not a dictionary and not a string: it is a{" "}
          <InlineCode>JsonElement</InlineCode>, a view into the{" "}
          <InlineCode>JsonDocument</InlineCode> that produced it.
        </p>
        <CodeBlock>{DISPOSED}</CodeBlock>
        <p>
          The exception has nothing to do with serialisation — the value is a pointer into
          memory that was already returned to a pool. Two fixes, one of which is a
          design fix:
        </p>
        <CodeBlock>{CLONED}</CodeBlock>
        <p>
          <InlineCode>Clone()</InlineCode> copies the subtree out of the document so it
          survives disposal, at the cost of a hidden allocation per value. Using{" "}
          <InlineCode>JsonNode</InlineCode> is the better answer when the data is genuinely
          open-ended: it is a mutable tree that owns its values, so there is no document to
          outlive. When the shape is known, the real fix is a class the generator could not
          infer from two disagreeing samples.
        </p>
      </ContentSection>

      <ContentSection id="records" title="Positional records skip the initialiser, and the check">
        <p>
          A record is the right shape for a read-only response model, and one line replaces
          a whole class. It also removes the initialiser that was hiding the missing-key
          problem — not by solving it, but by moving it:
        </p>
        <CodeBlock>{RECORD}</CodeBlock>
        <p>
          A record component has no initialiser, so an absent key passes{" "}
          <InlineCode>default(T)</InlineCode> to the constructor:{" "}
          <InlineCode>null</InlineCode> for <InlineCode>Status</InlineCode> even though the
          parameter is annotated non-nullable, <InlineCode>0</InlineCode> for{" "}
          <InlineCode>Total</InlineCode>. Nullable reference types do not run inside
          deserialisation, so the annotation is a promise the constructor cannot keep. The
          same rules as before apply — <InlineCode>required</InlineCode> for guaranteed
          keys, nullable types for the rest — and a record gives you one extra option: a
          validating constructor that rejects a null where the contract says there cannot
          be one.
        </p>
      </ContentSection>

      <ContentSection id="verify" title="Round-trip with a real payload">
        <p>
          The test that catches binding, casing and numeric mistakes in one pass: parse the
          captured response, serialize the object back, and compare the two trees.
        </p>
        <CodeBlock>{ROUND_TRIP}</CodeBlock>
        <p>
          <InlineCode>JsonNode.DeepEquals</InlineCode> compares structure and values while
          ignoring formatting, so a reformatted response does not fail the test. What it
          does catch: a property that never bound (its key disappears from the output), a
          value that changed type, and a field that serialised as the wrong name. Keep one
          captured response per endpoint — the file becomes a contract that fails the moment
          the API changes shape. For the same technique in other languages, see the{" "}
          <Link
            href="/guides/convert-json-to-java-pojo"
            className="text-blue-700 underline underline-offset-2"
          >
            Java guide
          </Link>{" "}
          and the{" "}
          <Link
            href="/guides/convert-json-to-go-struct"
            className="text-blue-700 underline underline-offset-2"
          >
            Go guide
          </Link>
          .
        </p>
      </ContentSection>

      <FaqSection items={FAQ} path={guide.href} />
    </GuideShell>
  );
}
