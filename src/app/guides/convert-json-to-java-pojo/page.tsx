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

const SLUG = "convert-json-to-java-pojo";
const guide = getGuide(SLUG)!;

export const metadata = pageMetadata({
  // The H1 keeps the full clause; the SERP title has to leave room for the
  // 16-character site suffix and still fit inside 60 characters.
  title: "JSON to Java POJOs: primitive or boxed",
  description: guide.description,
  path: guide.href,
});

const PRIMITIVE = `public class Order {
    public long id;
    public String status;
    public double total;
    public int itemCount;
}`;

const BOXED = `public class Order {
    public long id;
    public String status;
    public BigDecimal total;
    public Integer itemCount;
}`;

/** What Jackson does with each declaration, for each JSON state. */
const JACKSON_MATRIX = [
  {
    declaration: "double total;",
    absent: "0.0 — indistinguishable from a real zero",
    null: "0.0 — silently, because FAIL_ON_NULL_FOR_PRIMITIVES is off",
    zero: "0.0",
    verdict: "Only safe when the field is always sent and never null.",
  },
  {
    declaration: "Double total;",
    absent: "null",
    null: "null",
    zero: "0.0",
    verdict: "Separates a real zero from nothing, but not null from absent.",
  },
  {
    declaration: "Optional<Double> total;",
    absent: "null — the field is never assigned",
    null: "Optional.empty()",
    zero: "Optional.of(0.0)",
    verdict: "Works only with jackson-datatype-jdk8 registered, and it still leaves absent as null.",
  },
  {
    declaration: "double total; + FAIL_ON_NULL_FOR_PRIMITIVES",
    absent: "0.0",
    null: "JsonMappingException",
    zero: "0.0",
    verdict: "Turns one of the two silent cases into an error. Absent stays silent.",
  },
];

const RECORD = `public record Order(
        long id,
        String status,
        BigDecimal total,
        Integer itemCount) {
}`;

const RECORD_PATCHED = `public record Order(
        @JsonProperty("id") long id,
        @JsonProperty("status") String status,
        @JsonProperty("total") BigDecimal total,
        @JsonProperty("item_count") Integer itemCount) {
}`;

const NESTED = `public class Order {
    public long id;
    public Customer customer;

    // static: Jackson can construct this on its own
    public static class Customer {
        public String email;
    }
}`;

const MONEY = `// wrong for money: 0.1 + 0.2 != 0.3
public double total;

// right for money: exact decimal, no binary rounding
public BigDecimal total;

// and if the JSON sends a string, say so:
@JsonFormat(shape = JsonFormat.Shape.STRING)
public BigDecimal total;`;

const ROUND_TRIP = `class OrderTest {
    private final ObjectMapper mapper = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    @Test
    void roundTripsThePayload() throws Exception {
        String raw = "{\\"id\\":84126,\\"total\\":\\"19.50\\",\\"coupon_code\\":null}";

        Order order = mapper.readValue(raw, Order.class);
        assertNull(order.couponCode);

        JsonNode before = mapper.readTree(raw);
        JsonNode after = mapper.readTree(mapper.writeValueAsString(order));

        // LENIENT: ignore extra fields the POJO does not model
        JSONAssert.assertEquals(before, after, JSONCompareMode.LENIENT);
    }
}`;

const FAQ = [
  {
    question: "Why does the generator use Integer instead of int?",
    answer:
      "Because int has no way to say nothing. A primitive int field that no key was provided for holds 0, which is a legal value — so a caller reading itemCount cannot tell a real zero from a field the server never sent. Integer is a reference, so an absent or null key leaves it null and the difference survives. The cost is one null check and a boxed object per field, which is nothing next to a wrong total.",
  },
  {
    question: "Does FAIL_ON_NULL_FOR_PRIMITIVES fix the primitive problem?",
    answer:
      "Half of it. Enabling that DeserializationFeature makes an explicit null throw instead of becoming 0, which is a real improvement. It cannot help with an absent key, because Jackson never sees the key at all — there is nothing to fail on. If distinguishing absent from null matters, use a reference type or Optional, not a feature flag.",
  },
  {
    question: "Why are the nested classes static?",
    answer:
      "An inner class that is not static carries a hidden reference to an enclosing instance, so its constructor takes an extra parameter Jackson cannot supply. Deserialisation fails with a message about no suitable constructor. The static keyword removes that parameter and gives Jackson a plain class it can instantiate, while keeping the nesting purely organisational.",
  },
  {
    question: "Should I use a record instead of a class?",
    answer:
      "If the model is read-only, yes — a record gives immutability plus equals, hashCode and toString for free, which a plain POJO only gets through Lombok. Jackson supports records from 2.12, but parameter names are only visible at runtime if you compile with -parameters; without that flag every parameter looks like arg0 and binding fails, unless you annotate each component with @JsonProperty.",
  },
  {
    question: "Why does the generator emit BigDecimal for some fields?",
    answer:
      "It does not — this is the one decision a sample cannot make. A JSON number 19.50 could be a price, a weight or a ratio, and all three arrive as the same token. The generator emits double, which is right for measurements and wrong for money, because 0.1 + 0.2 is not 0.3 in binary floating point. Change the money fields to BigDecimal yourself; the guide you are reading explains where the boundary is.",
  },
  {
    question: "Can a long hold a 19-digit ID safely?",
    answer:
      "Java's long is 64-bit and exact, so 9021073482910473821 fits with room to spare — as long as Jackson parses it directly into a long. The precision is lost elsewhere: if an intermediate JavaScript service parsed the JSON first, the value was already rounded to a double. Java is the safe endpoint, not a safe transport.",
  },
  {
    question: "How do dates come through?",
    answer:
      "As strings, unless you register JavaTimeModule and declare LocalDate, LocalDateTime, Instant or OffsetDateTime. With the module registered, ISO 8601 binds automatically. Use Instant for timestamps with a Z suffix and OffsetDateTime when the original offset must survive, because Instant normalises everything to UTC.",
  },
  {
    question: "What is @JsonProperty actually doing?",
    answer:
      "It replaces the property name Jackson derives from the field or getter with the exact string you give it. The generator emits it whenever the Java name differs from the JSON key — snake_case fields, kebab-case keys, or names that had to be renamed because a digit or a reserved word made the original illegal as an identifier.",
  },
];

export default function Page() {
  return (
    <GuideShell guide={guide}>
      <ContentSection id="three-states" title="A generated POJO answers 0 where the document said nothing">
        <p>
          Java has three ways to declare a number field and JSON has three states for a
          key, but the two sets do not line up. Generated code usually picks the shortest
          declaration:
        </p>
        <CodeBlock>{PRIMITIVE}</CodeBlock>
        <p>
          Bind an order that omits <InlineCode>itemCount</InlineCode> and the field reads{" "}
          <InlineCode>0</InlineCode>. Bind one that sends{" "}
          <InlineCode>{`"itemCount": null`}</InlineCode> and it also reads{" "}
          <InlineCode>0</InlineCode>. Bind one that genuinely sends{" "}
          <InlineCode>{`"itemCount": 0`}</InlineCode> and it reads{" "}
          <InlineCode>0</InlineCode> again. Three different documents, one value, no
          exception — and any code downstream that branches on{" "}
          <InlineCode>itemCount == 0</InlineCode> now treats &ldquo;the server forgot the
          field&rdquo; as &ldquo;this order is empty&rdquo;.
        </p>
        <p>
          The same document with reference types keeps the distinction. Java calls this the
          boxed form, and it is the version a model thinking about absence needs:
        </p>
        <CodeBlock>{BOXED}</CodeBlock>
        <p>
          Nothing about the JSON changed; only the declarations did. What is left is the
          case Java still cannot express — absent versus null — and that is where the next
          section starts.
        </p>
      </ContentSection>

      <ContentSection
        id="jackson"
        title="What Jackson actually does, declaration by declaration"
      >
        <p>
          The behaviour is decided by Jackson&rsquo;s defaults, not by the field name, and
          the defaults are quiet. <InlineCode>FAIL_ON_NULL_FOR_PRIMITIVES</InlineCode> is
          off, so a null arriving at a primitive is written as{" "}
          <InlineCode>0</InlineCode> with no warning. The table below is the whole
          decision surface:
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-[13px]">
            <caption className="sr-only">
              Jackson behaviour for primitive, boxed and Optional fields
            </caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-3 py-2 font-semibold">
                  Declaration
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
              {JACKSON_MATRIX.map((row) => (
                <tr key={row.declaration}>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-slate-800">
                    {row.declaration}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{row.absent}</td>
                  <td className="px-3 py-2.5 text-slate-600">{row.null}</td>
                  <td className="px-3 py-2.5 text-slate-600">{row.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Read the second column, not the third. Everyone worries about{" "}
          <InlineCode>null</InlineCode> because it is visible in the payload, but an absent
          key is the common case with optional fields and no declaration in the table
          recovers it: Jackson simply never calls the setter, so the field keeps whatever
          the constructor left there. A reference type gives you{" "}
          <InlineCode>null</InlineCode> for both, which is honest about the fact that you
          cannot tell them apart — and is why the{" "}
          <Link
            href="/guides/convert-json-to-go-struct"
            className="text-blue-700 underline underline-offset-2"
          >
            Go guide
          </Link>{" "}
          arrives at the same conclusion from a different language.
        </p>
        <p>
          If you genuinely need to know whether a key was present, the only reliable
          mechanism is to observe the setter — a flag set inside it, or{" "}
          <InlineCode>@JsonAnySetter</InlineCode> with a map — because by the time the field
          is assigned, the information is gone. Everything else is inference from null.
        </p>
      </ContentSection>

      <ContentSection id="records" title="Records are shorter, and stricter about names">
        <p>
          Java 16 records are the right shape for a read-only API model: one line per
          component, plus <InlineCode>equals</InlineCode>, <InlineCode>hashCode</InlineCode>{" "}
          and <InlineCode>toString</InlineCode> generated for you, which a plain POJO only
          gets through Lombok or by hand.
        </p>
        <CodeBlock>{RECORD}</CodeBlock>
        <p>
          The catch is invisible at compile time. Jackson binds a record through its
          canonical constructor, and to do that it needs the parameter <em>names</em> — but
          the JVM does not keep them unless you compile with{" "}
          <InlineCode>-parameters</InlineCode>. Without that flag every component reads as{" "}
          <InlineCode>arg0</InlineCode>, <InlineCode>arg1</InlineCode> and binding fails
          with an error listing unknown properties. Annotating each component works
          regardless of compiler flags, which is why generated records carry the
          annotations even when the names already match:
        </p>
        <CodeBlock>{RECORD_PATCHED}</CodeBlock>
        <p>
          Add the flag in <InlineCode>maven-compiler-plugin</InlineCode> or{" "}
          <InlineCode>javac -parameters</InlineCode> and you can drop the annotations for
          fields whose names match exactly. Keep them for anything that was renamed, or the
          record stops binding the moment someone changes the JSON key.
        </p>
        <p>
          Records also cannot extend a class and cannot have mutable fields, which is fine
          for a response model and wrong for a form-backing bean that a UI framework
          populates property by property. That is the one case where the plain POJO is
          still the right answer.
        </p>
      </ContentSection>

      <ContentSection id="nested" title="Why every nested class must be static">
        <p>
          A non-static inner class holds an implicit reference to its enclosing instance,
          and the compiler makes that reference a parameter of its constructor. Jackson
          asks the class for a no-argument constructor, does not find one, and throws an{" "}
          <InlineCode>InvalidDefinitionException</InlineCode> mentioning that no suitable
          constructor exists.
        </p>
        <CodeBlock>{NESTED}</CodeBlock>
        <p>
          The <InlineCode>static</InlineCode> keyword removes the hidden parameter without
          changing how the class is used, and keeps the nesting as pure organisation. It is
          also why a generator that emits Java classes places them inside the parent as{" "}
          <InlineCode>public static class</InlineCode> instead of as separate top-level
          types: Java allows exactly one public top-level class per file, so nesting is the
          only way to keep a small model in one file that compiles.
        </p>
      </ContentSection>

      <ContentSection id="money" title="double is a measurement type, not a money type">
        <p>
          A JSON number does not carry units, and no amount of sampling tells a generator
          whether <InlineCode>19.50</InlineCode> is a price, a weight or a ratio. It
          therefore emits <InlineCode>double</InlineCode>, which is the right default for
          measurements and the wrong one for money: binary floating point cannot represent
          0.1 exactly, so sums drift and comparisons fail.
        </p>
        <CodeBlock>{MONEY}</CodeBlock>
        <p>
          Two follow-ups belong in the same pass over the generated file. First, if the
          payload sends prices as strings (common in payment APIs), tell Jackson with{" "}
          <InlineCode>@JsonFormat(shape = STRING)</InlineCode> — without it a string
          arriving at a <InlineCode>BigDecimal</InlineCode> field is accepted only because
          Jackson coerces by default, and that coercion is easy to lose when someone
          enables strict mode. Second, pick the scale explicitly:{" "}
          <InlineCode>BigDecimal</InlineCode> keeps the scale it parsed (19.50 stays 19.50,
          with two decimal places), which matters when you send the value back to an
          accounting system that compares by scale.
        </p>
        <p>
          Integers are the easier half. A <InlineCode>long</InlineCode> holds a 19-digit ID
          exactly, and Jackson parses the literal straight into it without a double
          detour. The rounding you may have seen elsewhere happened before the payload
          reached Java — see{" "}
          <Link
            href="/guides/why-json-numbers-lose-precision"
            className="text-blue-700 underline underline-offset-2"
          >
            why JSON numbers lose precision
          </Link>{" "}
          for the JavaScript leg of that journey.
        </p>
      </ContentSection>

      <ContentSection id="verify" title="Round-trip the payload before you trust the model">
        <p>
          A round trip catches almost every binding bug at once: bind the real payload,
          write it back out, and compare as JSON trees. A field that disappears points at a
          name Jackson never matched; a value that changed points at a numeric type; a
          field that turned into 0 points at a primitive.
        </p>
        <CodeBlock>{ROUND_TRIP}</CodeBlock>
        <p>
          Compare trees rather than strings — key order and whitespace are free to differ —
          and run it leniently so fields the POJO deliberately omits do not fail the test.
          Keep one captured response per endpoint as a fixture, and the suite becomes a
          contract that a regenerated model has to satisfy.
        </p>
        <ProseList
          items={[
            <>
              <strong className="font-medium text-slate-900">Start from a real
              response.</strong>{" "}
              Hand-written samples contain exactly the fields you remembered, which is why
              they never catch the missing one.
            </>,
            <>
              <strong className="font-medium text-slate-900">Assert the null case
              explicitly.</strong>{" "}
              A second fixture with{" "}
              <InlineCode>coupon_code: null</InlineCode> is what proves the field is boxed
              rather than primitive.
            </>,
            <>
              <strong className="font-medium text-slate-900">Regenerate, then re-run.</strong>{" "}
              The point of the test is to fail when the API changes shape, not to be
              satisfied once in review.
            </>,
          ]}
        />
      </ContentSection>

      <FaqSection items={FAQ} path={guide.href} />
    </GuideShell>
  );
}
