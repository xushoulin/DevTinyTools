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

const SLUG = "convert-json-to-go-struct";
const guide = getGuide(SLUG)!;

export const metadata = pageMetadata({
  title: guide.title,
  description: guide.description,
  path: guide.href,
});

/** What a one-sample generator prints for a typical API response. */
const GENERATED = `type Order struct {
	ID         string   \`json:"id"\`
	Status     string   \`json:"status"\`
	Total      float64  \`json:"total"\`
	CouponCode string   \`json:"coupon_code"\`
	Items      []Item   \`json:"items"\`
}

type Item struct {
	SKU       string  \`json:"sku"\`
	Quantity  int     \`json:"quantity"\`
	UnitPrice float64 \`json:"unit_price"\`
}`;

/** The same struct after the endpoint sends an order without a coupon. */
const PATCHED = `type Order struct {
	ID         string   \`json:"id"\`
	Status     string   \`json:"status"\`
	Total      float64  \`json:"total"\`
	CouponCode *string  \`json:"coupon_code,omitempty"\`
	Items      []Item   \`json:"items"\`
}`;

const TAG_FORMS = [
  {
    form: `Field string \`json:"field"\``,
    onMissing: "Field stays at its zero value (\") — indistinguishable from a real empty string",
    onNull: "Unmarshal error: cannot unmarshal null into string",
    verdict: "Correct for values that are always present and never null.",
  },
  {
    form: `Field string \`json:"field,omitempty"\``,
    onMissing: "Same as above — omitempty affects marshalling only",
    onNull: "Unmarshal error, same as above",
    verdict: "A common mistake: omitempty does nothing on unmarshal, and zero values are silently dropped when writing back.",
  },
  {
    form: `Field *string \`json:"field,omitempty"\``,
    onMissing: "Field stays nil — you can tell absent from empty",
    onNull: "Field is set to nil — null and absent look identical, which is usually the pragmatic choice",
    verdict: "The form that matches how APIs actually behave, at the cost of pointer checks.",
  },
];

const OMIT_EMPTY_TRAPS = [
  <>
    <strong className="font-medium text-slate-900">It fires on zero values, not just
    absent keys.</strong>{" "}
    A <InlineCode>{`Count int \`json:"count,omitempty"\``}</InlineCode> that legitimately
    holds{" "}
    <InlineCode>0</InlineCode> is dropped when you marshal the struct back. The consumer
    reading the output cannot tell &ldquo;zero&rdquo; from &ldquo;not sent&rdquo;.
  </>,
  <>
    <strong className="font-medium text-slate-900"><InlineCode>false</InlineCode> is a zero
    value too.</strong>{" "}
    Booleans are the worst case, because <InlineCode>false</InlineCode> is often a
    meaningful answer rather than an absence. Leave omitempty off boolean fields unless
    the key really is optional in both directions.
  </>,
  <>
    <strong className="font-medium text-slate-900">nil and empty slices marshal
    differently.</strong>{" "}
    <InlineCode>[]Item(nil)</InlineCode> with omitempty is omitted entirely;
    <InlineCode> []Item{"{}"}</InlineCode> serialises as{" "}
    <InlineCode>[]</InlineCode>. If the API sends{" "}
    <InlineCode>{`"items": []`}</InlineCode>, decide which one your round trip preserves.
  </>,
  <>
    <strong className="font-medium text-slate-900">Structs are never empty.</strong>{" "}
    omitempty has no effect on nested struct values — there is no concept of a zero
    struct. A nested object that should disappear when empty needs a pointer type.
  </>,
];

const FAQ = [
  {
    question: "Why did my generator make every field a float64?",
    answer:
      "It decoded the sample into interface{} first. encoding/json stores every JSON number as a float64 in that path, so the generator never saw the original integer. A tool that tracks integrality per value — like the JSON to Go tool — can still emit int64; a tool that lost the distinction cannot.",
  },
  {
    question: "Is it safe to paste a production response into a browser tool?",
    answer:
      "Only if the tool runs locally. This one parses and generates in the tab, with no network request — you can confirm that in the browser's network panel. Even so, redact tokens and personal data before pasting anything into a page you did not write.",
  },
  {
    question: "Should I use pointers for every optional field?",
    answer:
      "Only where absent and zero genuinely differ. Every pointer is a nil check at each call site, and a codebase full of *string is harder to read than one extra empty-string case. The fields worth a pointer are ones where the distinction carries information: a coupon code that was never applied versus one that is empty.",
  },
  {
    question: "Can Go unmarshal into a struct with extra JSON keys?",
    answer:
      "Yes — encoding/json ignores keys that have no matching field. That is why a missing key in the sample does not surface until your code reads the field and finds a zero value. It is also why a typo in a tag fails silently: the data is dropped, not rejected.",
  },
  {
    question: "What is json.Number for?",
    answer:
      "Decoding numbers without losing precision. When you unmarshal into a map[string]interface{} — or set UseNumber on the decoder — every number arrives as the original literal in a string wrapper. Convert with .Int64() or .Float64() once you know which one it is. For 19-digit IDs that must round-trip exactly, it is the only correct option besides storing them as strings.",
  },
];

export default function Page() {
  return (
    <GuideShell guide={guide}>
      <ContentSection id="sample" title="A generated struct is a hypothesis">
        <p>
          Run any JSON-to-Go generator on one response from{" "}
          <InlineCode>GET /api/orders</InlineCode> and you get a struct that looks
          finished:
        </p>
        <CodeBlock>{GENERATED}</CodeBlock>
        <p>
          It compiles, it unmarshals the sample, and every tag matches. Then the endpoint
          sends an order placed without a coupon, and the same struct reports the failure
          somewhere else entirely: unmarshalling succeeds, and{" "}
          <InlineCode>order.CouponCode</InlineCode> quietly holds{" "}
          <InlineCode>&quot;&quot;</InlineCode> — the zero value. Nothing errored; the
          struct just answered a question nobody asked it.
        </p>
        <p>
          The fix is to decide, per field, what &ldquo;not there&rdquo; means. That
          decision is invisible in the sample and is exactly what the tags exist to
          encode:
        </p>
        <CodeBlock>{PATCHED}</CodeBlock>
        <p>
          The rest of this guide is about the three places where JSON and Go disagree
          hard enough to lose data: numbers, absence, and names.
        </p>
      </ContentSection>

      <ContentSection id="float64" title="Every number is a float64 somewhere">
        <p>
          Go&rsquo;s <InlineCode>encoding/json</InlineCode> has a rule that surprises
          everyone once: when you decode into <InlineCode>interface{"{}"}</InlineCode>,
          <strong className="font-medium text-slate-900"> every JSON number becomes a{" "}
          float64</strong>. Not &ldquo;integers become int&rdquo; — everything. The
          decoder never saw an integer, because JSON numbers have no integer type; it
          saw a literal and stored the nearest double.
        </p>
        <p>
          This is the Go face of the{" "}
          <Link
            href="/guides/why-json-numbers-lose-precision"
            className="text-blue-700 underline underline-offset-2"
          >
            precision problem every JSON tool shares
          </Link>
          : above 2<sup>53</sup>, consecutive integers map to the same double. A 19-digit
          order ID unmarshalled into <InlineCode>interface{"{}"}</InlineCode> comes back
          with different digits, and no struct definition can fix a value that was
          mangled before it reached the field.
        </p>
        <ProseList
          items={[
            <>
              <strong className="font-medium text-slate-900">Typed fields are
              safe.</strong>{" "}
              Unmarshalling into{" "}
              <InlineCode>{`ID int64 \`json:"id"\``}</InlineCode> parses
              the literal directly into an integer — the float64 detour only happens on
              the <InlineCode>interface{"{}"}</InlineCode> path. The struct is not just
              convenient, it is the precision fix.
            </>,
            <>
              <strong className="font-medium text-slate-900">Generators see what their
              parser saw.</strong>{" "}
              A tool that runs the sample through <InlineCode>JSON.parse</InlineCode>{" "}
              (JavaScript) or <InlineCode>Unmarshal</InlineCode> into{" "}
              <InlineCode>interface{"{}"}</InlineCode> has already flattened every number
              to a double before inference starts. Whether it can emit{" "}
              <InlineCode>int64</InlineCode> at all depends on whether the parser
              preserved integrality.
            </>,
            <>
              <strong className="font-medium text-slate-900">Big IDs want{" "}
              <InlineCode>string</InlineCode>.</strong>{" "}
              If the ID is wider than 2<sup>53</sup> and must round-trip exactly, the
              robust choice is a string field — or <InlineCode>json.Number</InlineCode>{" "}
              with <InlineCode>Decoder.UseNumber</InlineCode>, which keeps the original
              literal untouched.
            </>,
          ]}
        />
        <p>
          A generator that marks whole-number fields <InlineCode>int64</InlineCode> and
          mixed ones <InlineCode>float64</InlineCode> is doing one real job: telling you
          which values it watched cross the 2<sup>53</sup> line. One that emits{" "}
          <InlineCode>float64</InlineCode> everywhere is being honest about a parser that
          threw the information away.
        </p>
      </ContentSection>

      <ContentSection id="optional" title="Optional is not nullable, and neither is omitempty">
        <p>
          JSON has three states for a key: present with a value, present with{" "}
          <InlineCode>null</InlineCode>, absent. Go strings, numbers and booleans have
          one: their zero value. A plain struct field collapses all three JSON states
          into one, and no tag can un-collapse them, because unmarshalling has already
          happened by the time any tag would be read.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-[13px]">
            <caption className="sr-only">
              How three Go tag forms behave when a key is absent or null
            </caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-3 py-2 font-semibold">
                  Field declaration
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Key absent
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Key is null
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Verdict
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {TAG_FORMS.map((row) => (
                <tr key={row.form}>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-slate-800">
                    {row.form}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{row.onMissing}</td>
                  <td className="px-3 py-2.5 text-slate-600">{row.onNull}</td>
                  <td className="px-3 py-2.5 text-slate-600">{row.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          The table&rsquo;s sharpest edge is the middle row:{" "}
          <InlineCode>omitempty</InlineCode> is a marshalling directive and does nothing
          at all on the unmarshal side. People add it expecting optionality and get a
          struct that still errors on <InlineCode>null</InlineCode>. The pointer in the
          third row is doing the actual work.
        </p>
        <p>
          The{" "}
          <Link href="/json-to-go" className="text-blue-700 underline underline-offset-2">
            JSON to Go tool
          </Link>{" "}
          encodes exactly this distinction: a key missing from some samples becomes{" "}
          <InlineCode>,omitempty</InlineCode>, a key that is sometimes{" "}
          <InlineCode>null</InlineCode> becomes a pointer, and the two rules are kept
          separate on purpose.
        </p>
      </ContentSection>

      <ContentSection id="omitempty" title="omitempty drops zero values, not missing ones">
        <p>
          The tag&rsquo;s actual contract: skip the field when it equals Go&rsquo;s zero
          value for its type — <InlineCode>0</InlineCode>,{" "}
          <InlineCode>&quot;&quot;</InlineCode>, <InlineCode>false</InlineCode>,{" "}
          <InlineCode>nil</InlineCode>, an empty map or slice. That contract has four
          consequences people meet the hard way:
        </p>
        <ProseList items={OMIT_EMPTY_TRAPS} />
        <p>
          The rule of thumb that survives contact with real APIs: use omitempty where the
          key is optional in <em>both</em> directions, use a pointer where &ldquo;absent&rdquo;
          and &ldquo;zero&rdquo; must stay distinguishable, and leave both off for fields
          the endpoint always sends.
        </p>
      </ContentSection>

      <ContentSection id="names" title="Name fields the way Go reads them">
        <p>
          Go&rsquo;s naming convention is the source of one more silent mismatch: the{" "}
          <InlineCode>json</InlineCode> tag must carry the exact key from the wire, while
          the field name follows Go style. That is why{" "}
          <InlineCode>api_url</InlineCode> becomes <InlineCode>APIURL</InlineCode> and{" "}
          <InlineCode>id</InlineCode> becomes <InlineCode>ID</InlineCode> — the{" "}
          <a
            href="https://github.com/golang/lint/blob/master/misc/README.md"
            className="text-blue-700 underline underline-offset-2"
            rel="noreferrer noopener"
          >
            golint initialisms list
          </a>{" "}
          treats URL, API, ID, HTTP and friends as whole words, and a linter will flag{" "}
          <InlineCode>ApiUrl</InlineCode> in review.
        </p>
        <p>
          Two failure modes live here. A generator that leaves{" "}
          <InlineCode>ApiUrl</InlineCode> produces code that fails lint on day one. A
          generator that forgets the tag entirely — relying on Go&rsquo;s case-insensitive
          key match — still works, until someone reorders or renames the field and the
          JSON key silently stops matching. Always emit the tag, even when it matches the
          field name: the tag is the contract, the field name is style.
        </p>
      </ContentSection>

      <ContentSection id="verify" title="Verify the struct with a round trip">
        <p>
          The cheapest test that catches nearly every struct bug is a round trip:
          unmarshal the real payload into the generated struct, marshal it back, and
          compare the JSON. Fields that come out missing point at omitempty on zero
          values; fields that come out renamed point at a wrong tag; values that come out
          different point at the float64 path.
        </p>
        <CodeBlock>{`func TestOrderRoundTrip(t *testing.T) {
	raw := []byte(\`{"id":"84126","total":19.5,"items":[]}\`)

	var order Order
	if err := json.Unmarshal(raw, &order); err != nil {
		t.Fatal(err)
	}

	out, err := json.Marshal(order)
	if err != nil {
		t.Fatal(err)
	}

	// Compare as parsed values, not bytes: key order and
	// whitespace are free to differ.
	var a, b any
	if err := json.Unmarshal(raw, &a); err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(out, &b); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(a, b) {
		t.Fatalf("round trip changed the data:\\n in: %s\\nout: %s", raw, out)
	}
}`}</CodeBlock>
        <p>
          Keep one fixture per endpoint — a captured real response, not a hand-written
          sample — and the test becomes a contract the struct cannot silently break.
        </p>
      </ContentSection>

      <FaqSection items={FAQ} path={guide.href} />
    </GuideShell>
  );
}
