import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ContentSection, ProseList } from "@/components/content-section";
import { pageMetadata } from "@/lib/metadata";
import { SITE_NAME } from "@/lib/site";
import { PLANNED_TOOLS, TOOLS } from "@/lib/tools";

export const metadata = pageMetadata({
  title: "About",
  description:
    "What DevTinyTools is, how the tools are built, and the principles behind a small set of browser-based developer utilities.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About" }]} />

      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        About {SITE_NAME}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
        {SITE_NAME} is a small, independent collection of developer utilities. Each page
        solves one problem, works without an account, and processes your data inside the
        browser tab.
      </p>

      <div className="mt-8 space-y-9">
        <ContentSection id="why" title="Why it exists">
          <p>
            Most everyday developer tasks are tiny: read a minified payload, check why a
            document is rejected, strip whitespace before shipping. The tools that do these
            things are often heavier than the task — a full dashboard, an account, a file
            upload to an unknown server, or several megabytes of JavaScript.
          </p>
          <p>
            This site takes the opposite approach. A tool page is a form and a result. There
            is no onboarding, no workspace, and no reason to sign in, because there is
            nothing to keep.
          </p>
        </ContentSection>

        <ContentSection id="how-it-works" title="How the tools work">
          <p>
            The site is a statically generated Next.js application. Tool pages ship a small
            client-side component that holds the editor state; everything else — layout,
            navigation, metadata, the explanatory text — is rendered on the server as plain
            HTML.
          </p>
          <p>
            JSON handling uses the browser&apos;s own <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px]">JSON.parse</code>{" "}
            and <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px]">JSON.stringify</code>. There is no backend
            endpoint behind the buttons, which is the simplest way to guarantee that the
            document you paste never leaves your machine.
          </p>
        </ContentSection>

        <ContentSection id="principles" title="Principles">
          <ProseList
            items={[
              <>
                <strong className="font-medium text-slate-900">Local processing first.</strong>{" "}
                If a task can be done in the browser, it is done in the browser.
              </>,
              <>
                <strong className="font-medium text-slate-900">No accounts.</strong> Nothing
                here needs a profile, an email address or a billing relationship.
              </>,
              <>
                <strong className="font-medium text-slate-900">Honest limits.</strong> Error
                positions are described as the parser reports them, and the site does not
                claim to validate against your schema or to make your data correct.
              </>,
              <>
                <strong className="font-medium text-slate-900">No dark patterns.</strong> No
                fake counters, no invented testimonials, no paywalls, and no ads placed where
                they interfere with copying or formatting.
              </>,
              <>
                <strong className="font-medium text-slate-900">Small surface area.</strong>{" "}
                Few dependencies, no state library, no tracking scripts.
              </>,
            ]}
          />
        </ContentSection>

        <ContentSection id="available" title="What is available today">
          <p>Three tools are live:</p>
          <ul className="space-y-2">
            {TOOLS.map((tool) => (
              <li key={tool.href}>
                <Link
                  href={tool.href}
                  className="font-medium text-blue-700 underline underline-offset-2"
                >
                  {tool.heading}
                </Link>{" "}
                — {tool.summary}
              </li>
            ))}
          </ul>
          <p className="pt-1">
            Two more are planned: {PLANNED_TOOLS.map((tool) => tool.name).join(" and ")}. They
            are listed on the homepage without links, because publishing empty placeholder
            pages would not help anyone.
          </p>
        </ContentSection>

        <ContentSection id="disclaimer" title="A note on correctness">
          <p>
            These tools are provided as-is, without warranty. They are useful for inspecting
            and cleaning up data, but they are not a substitute for validating data against
            your own requirements — a document can be perfectly valid JSON and still be wrong
            for your application. Do not rely on this site as the only check before
            overwriting production data.
          </p>
        </ContentSection>

        <ContentSection id="more" title="Questions, corrections and privacy">
          <p>
            If something behaves unexpectedly, the{" "}
            <Link href="/contact" className="text-blue-700 underline underline-offset-2">
              contact page
            </Link>{" "}
            explains what to include in a report. The{" "}
            <Link href="/privacy-policy" className="text-blue-700 underline underline-offset-2">
              privacy policy
            </Link>{" "}
            documents exactly what the site does — and does not — collect.
          </p>
        </ContentSection>
      </div>
    </div>
  );
}
