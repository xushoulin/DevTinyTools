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

const SLUG = "generate-typescript-types-from-json";
const guide = getGuide(SLUG)!;

export const metadata = pageMetadata({
  title: guide.title,
  description: guide.description,
  path: guide.href,
});

/** Printed verbatim by the generator for the first order only. */
const ONE_SAMPLE = `export interface OrderItem {
  id: string;
  status: string;
  total: number;
  currency: string;
  couponCode: string;
  customer: OrderItemCustomer;
  items: OrderItemItems[];
  shippedAt: string;
}

export interface OrderItemCustomer {
  id: string;
  email: string;
  vip: boolean;
}

export interface OrderItemItems {
  sku: string;
  quantity: number;
  unitPrice: number;
}

export type Order = OrderItem[];`;

/** The same generator, given both orders. Four lines differ. */
const MERGED = `export interface OrderItem {
  id: string;
  status: string;
  total: number;
  currency: string;
  couponCode?: string;      // was: string
  customer: OrderItemCustomer;
  items: OrderItemItems[];
  shippedAt: string | null; // was: string
}`;

const DECISIONS = [
  {
    question: "A key exists in some array elements and not others",
    choice: "Optional, or required",
    consequence:
      "Required compiles and then throws on the record that lacks it. Optional costs one `?.` at the call site.",
  },
  {
    question: "A key holds a number in one record and a string in another",
    choice: "Union, or pick one",
    consequence:
      "Picking one is a guess that the compiler will stop checking. A union is honest and forces a narrowing at the point of use.",
  },
  {
    question: "A key is sometimes null",
    choice: "Union with null, or treat null as absence",
    consequence:
      "null is a value, not a missing key. Collapsing it loses the distinction the API is making.",
  },
  {
    question: "An array is empty in the sample",
    choice: "unknown, or invented element type",
    consequence:
      "An empty array says nothing about its elements. Guessing produces a type nobody verified.",
  },
  {
    question: "An object appears at two different paths",
    choice: "One shared type, or one per path",
    consequence:
      "Shared types read better but couple two unrelated shapes: change one and the other follows.",
  },
  {
    question: "The root is an array rather than an object",
    choice: "Type alias, or a wrapper interface",
    consequence:
      "A wrapper (`{ data: Order[] }`) that the API never sends is a lie that leaks into every call site.",
  },
];

const CANNOT_DECIDE = [
  <>
    <strong className="font-medium text-slate-900">Literal unions.</strong> A status field
    that is <InlineCode>&quot;shipped&quot;</InlineCode> in your sample is typed as{" "}
    <InlineCode>string</InlineCode>, not{" "}
    <InlineCode>&apos;shipped&apos; | &apos;pending&apos;</InlineCode>. The sample is one
    observation, not the set of allowed values — and a generator that guessed would be
    inventing an enum from a single row.
  </>,
  <>
    <strong className="font-medium text-slate-900">Dates.</strong> JSON has no date type. An
    ISO-8601 string is <InlineCode>string</InlineCode> and stays{" "}
    <InlineCode>string</InlineCode>. Typing it as <InlineCode>Date</InlineCode> would be a
    lie that only fails at runtime, when someone calls{" "}
    <InlineCode>.toISOString()</InlineCode> on a string.
  </>,
  <>
    <strong className="font-medium text-slate-900">Integers past 2^53.</strong> By the time
    the value reaches the generator it has already been through{" "}
    <InlineCode>JSON.parse</InlineCode>, so a 19-digit ID is a double and prints back with
    different digits. The type is <InlineCode>number</InlineCode> either way; the fix lives
    in the API, not in the types.
  </>,
  <>
    <strong className="font-medium text-slate-900">Optional versus nullable.</strong>{" "}
    <InlineCode>b?: number</InlineCode> means the key may be absent. It says nothing about{" "}
    <InlineCode>b: null</InlineCode>. Only a null in the sample justifies{" "}
    <InlineCode>| null</InlineCode>, which is why merging samples matters more than merging
    types.
  </>,
  <>
    <strong className="font-medium text-slate-900">Discriminated unions.</strong> A{" "}
    <InlineCode>payment</InlineCode> object that is a card in one response and a bank
    transfer in another is inferred as one object with every field optional. Collapsing two
    variants into one loose shape is the correct inference from the data and the wrong model
    of the domain; splitting it by hand is a decision only you can make.
  </>,
];

const FAQ = [
  {
    question: "Why does the same field come out differently on two machines?",
    answer:
      "Because the samples differ. Any generator describes the data it was given: paste one record and every field is required, paste five hundred records and the genuinely optional ones reveal themselves. If two people get different types, they pasted different payloads — the larger sample is the more accurate one.",
  },
  {
    question: "Should I commit the generated file or generate on the fly?",
    answer:
      "Commit it. A generated type that lives in the repo is visible in code review and diffs when the API changes, which is exactly the signal you want. Generating at build time hides the change until something breaks.",
  },
  {
    question: "Is it safe to paste a production response into a browser tool?",
    answer:
      "Only if the tool runs locally. This one parses and infers in the tab, with no network request — you can verify that in the network panel. Still redact tokens and personal data before pasting anything into a page you did not write.",
  },
  {
    question: "What is the difference between interface and type here?",
    answer:
      "Nothing at runtime — both erase. Interfaces can be merged by declaration and produce clearer error messages; type aliases can express unions and mapped types. The generator writes interfaces for objects and falls back to a type alias for the root when the root is an array or a primitive.",
  },
  {
    question: "Do I still need Zod if I have the interfaces?",
    answer:
      "If the data crosses a boundary you do not control, yes. An interface cannot reject a malformed response, because it does not exist at runtime. A schema can, and it names the path that failed. The usual pattern is to define the schema and infer the type from it, so they cannot drift.",
  },
];

export default function Page() {
  return (
    <GuideShell guide={guide}>
      <ContentSection id="one-sample" title="One response is not a contract">
        <p>
          Here is the generator run on a single order from{" "}
          <InlineCode>GET /api/orders</InlineCode>. It is a perfectly good interface — it
          compiles, it autocompletes, and every field is required because every field was
          present:
        </p>
        <CodeBlock>{ONE_SAMPLE}</CodeBlock>
        <p>
          Now run the same generator on the same endpoint, with a second order included. Four
          lines change, and two of them are the difference between working code and a runtime
          crash:
        </p>
        <CodeBlock>{MERGED}</CodeBlock>
        <p>
          Nothing about the first response was wrong. It simply did not contain a{" "}
          <InlineCode>couponCode</InlineCode>-less order, or a shipped order that has not
          shipped. The interface described the sample faithfully and the endpoint
          inaccurately, which is the normal failure mode of type inference and the reason the
          number of samples matters more than the quality of the generator.
        </p>
      </ContentSection>

      <ContentSection id="decisions" title="Six decisions every generator has to make">
        <p>
          Every JSON-to-TypeScript converter answers the same six questions. The output looks
          different mainly because they answer differently — and most of the arguments about
          which tool is better are really arguments about this table.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-[13px]">
            <caption className="sr-only">
              The decisions a JSON-to-TypeScript generator has to make
            </caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-3 py-2 font-semibold">
                  The situation
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  The choice
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  What goes wrong
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {DECISIONS.map((row) => (
                <tr key={row.question}>
                  <td className="px-3 py-2.5 text-slate-800">{row.question}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{row.choice}</td>
                  <td className="px-3 py-2.5 text-slate-600">{row.consequence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          The first row is the one that bites. A converter that reads only the first array
          element — which several popular tools do — will mark every field required, and it
          will do so silently. The generated file looks correct right up until the endpoint
          returns a record that does not match the one you happened to paste.
        </p>
      </ContentSection>

      <ContentSection id="merge" title="Merging samples is the whole trick">
        <p>
          The alternative is to infer each element and merge the results, so a key present in
          one record and absent in another becomes optional instead of required. That is what
          the{" "}
          <Link
            href="/json-to-typescript"
            className="text-blue-700 underline underline-offset-2"
          >
            JSON to TypeScript tool
          </Link>{" "}
          does, and it is why pasting an array of responses gives a better type than pasting
          a single object.
        </p>
        <p>
          Merging is not only about missing keys. Three more things fall out of the same
          traversal:
        </p>
        <ProseList
          items={[
            <>
              <strong className="font-medium text-slate-900">Unions appear where the data
              disagrees.</strong>{" "}
              <InlineCode>number</InlineCode> in one record and{" "}
              <InlineCode>string</InlineCode> in another become{" "}
              <InlineCode>number | string</InlineCode>, deduplicated by shape so a field that
              mixes three types does not produce five union members.
            </>,
            <>
              <strong className="font-medium text-slate-900">null joins the union instead of
              widening the whole type.</strong>{" "}
              One null in twenty records gives{" "}
              <InlineCode>string | null</InlineCode> — not{" "}
              <InlineCode>unknown</InlineCode>, and not a silently dropped field.
            </>,
            <>
              <strong className="font-medium text-slate-900">Nesting merges at its own
              level.</strong>{" "}
              An object inside an array inside an object is merged with its own counterparts,
              so optionality is decided where the variation actually is, not inherited from
              the parent.
            </>,
          ]}
        />
        <p>
          The practical rule: paste the largest response you can get, or several. Ten records
          cost nothing extra and catch almost every optional field a single record hides.
        </p>
      </ContentSection>

      <ContentSection id="cannot-decide" title="What no generator can decide for you">
        <p>
          Even with a thousand samples, five things are inference-proof. They are not
          limitations of a particular tool — they are information the data does not contain.
        </p>
        <ProseList items={CANNOT_DECIDE} />
        <p>
          Each of these is a five-line edit after generation, and each is worth doing:
          generated types are a starting point that removes the mechanical work, not a
          finished contract.
        </p>
      </ContentSection>

      <ContentSection id="runtime" title="Interfaces erase, schemas do not">
        <p>
          There is one more decision, and unlike the six above it has nothing to do with the
          sample: what should exist at runtime.
        </p>
        <p>
          A TypeScript <InlineCode>interface</InlineCode> is erased by the compiler. It
          describes what your code passes around, and it cannot inspect a response, because
          after compilation there is nothing left to run. That is fine for a value you
          produced. It is not fine for a value a server produced.
        </p>
        <p>
          A Zod schema is a real object.{" "}
          <InlineCode>schema.parse(body)</InlineCode> either returns typed data or throws with
          the path that failed —{" "}
          <InlineCode>items[1].unitPrice: expected number, received string</InlineCode>. On
          the untrusted boundary, that error is worth more than any compile-time type, because
          the bug is happening right then rather than three call frames later.
        </p>
        <p>
          The pattern that keeps both honest is to define the schema and derive the type from
          it with <InlineCode>z.infer</InlineCode>, so the validator and the types cannot
          drift apart. Generating the TypeScript interfaces and writing the schema by hand
          reintroduces exactly the duplication you were trying to remove.
        </p>
      </ContentSection>

      <ContentSection id="workflow" title="Keeping the types honest after generation">
        <ProseList
          items={[
            <>
              <strong className="font-medium text-slate-900">Generate from the real
              payload, once.</strong>{" "}
              Not from the docs and not from a hand-written sample. The docs describe the
              contract; the payload describes what the endpoint actually returns today, and
              those differ more often than anyone admits.
            </>,
            <>
              <strong className="font-medium text-slate-900">Name the root before you
              copy.</strong>{" "}
              Nested types inherit the root name, so <InlineCode>Order</InlineCode> produces{" "}
              <InlineCode>OrderCustomer</InlineCode> where <InlineCode>Root</InlineCode>{" "}
              produces <InlineCode>RootCustomer</InlineCode> — the same types, with a name
              that tells you what they are.
            </>,
            <>
              <strong className="font-medium text-slate-900">Commit the file and let it
              diff.</strong>{" "}
              When the API adds a field, the regenerated file shows one added line in review.
              That is a change worth noticing, and a type generated at build time hides it.
            </>,
            <>
              <strong className="font-medium text-slate-900">Add the literal unions by
              hand.</strong>{" "}
              Narrow the status and enum fields once, in a small file of your own that extends
              the generated one, so regeneration does not throw your work away.
            </>,
          ]}
        />
        <p>
          None of this makes the types correct — it makes them honest about what they were
          derived from, which is the most a sample can support.
        </p>
      </ContentSection>

      <FaqSection items={FAQ} path={guide.href} />
    </GuideShell>
  );
}
