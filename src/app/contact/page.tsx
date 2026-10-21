import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ContentSection, ProseList } from "@/components/content-section";
import { pageMetadata } from "@/lib/metadata";
import { getContactEmail, SITE_NAME } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Contact",
  description:
    "How to report a bug, suggest a tool or ask a question about DevTinyTools, and what information to include.",
  path: "/contact",
});

export default function ContactPage() {
  const contactEmail = getContactEmail();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />

      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        Contact
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
        {SITE_NAME} is a small project. There is one contact channel, and it is for bug
        reports, corrections and tool suggestions.
      </p>

      <div className="mt-8 space-y-9">
        {contactEmail ? (
          <section aria-labelledby="email-heading">
            <h2
              id="email-heading"
              className="text-xl font-semibold tracking-tight text-slate-900"
            >
              Email
            </h2>
            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
              <a
                href={`mailto:${contactEmail}`}
                className="font-mono text-sm text-blue-700 underline underline-offset-2"
              >
                {contactEmail}
              </a>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                This is the only official address for the site. Messages are read and
                answered when a reply is needed; there is no support contract, no SLA and no
                paid support tier.
              </p>
            </div>
          </section>
        ) : (
          <section aria-labelledby="email-heading">
            <h2
              id="email-heading"
              className="text-xl font-semibold tracking-tight text-slate-900"
            >
              Email
            </h2>
            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-700">
                A public contact address has not been published yet.
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                Rather than invent an address that nobody reads, this page will stay empty
                until a real mailbox is available. No other contact details are published at
                this time.
              </p>
            </div>
          </section>
        )}

        <ContentSection id="what-to-include" title="Writing a useful report">
          <p>
            A short message with the right details is far more useful than a long one without
            them. Please include:
          </p>
          <ProseList
            items={[
              <>
                <strong className="font-medium text-slate-900">What you did</strong> — the
                tool you used and the buttons you pressed.
              </>,
              <>
                <strong className="font-medium text-slate-900">What you expected</strong> and
                what happened instead.
              </>,
              <>
                <strong className="font-medium text-slate-900">The exact error text</strong>{" "}
                if one was shown, including the line and column.
              </>,
              <>
                <strong className="font-medium text-slate-900">Browser and version</strong>,
                plus your operating system. Parser messages differ between engines, so this
                matters for anything involving a syntax error.
              </>,
              <>
                <strong className="font-medium text-slate-900">A minimal sample</strong> — the
                smallest document that reproduces the problem, with any real values replaced.
              </>,
            ]}
          />
        </ContentSection>

        <ContentSection id="do-not-send" title="What not to send">
          <p>
            Never send credentials, API keys, access tokens, customer records or anything else
            confidential. The tools never transmit your data, and a bug report is not a reason
            to start. If a document is needed to reproduce a problem, replace the values with
            placeholders first.
          </p>
        </ContentSection>

        <ContentSection id="before-writing" title="Before you write">
          <p>
            Most questions about rejected JSON are answered by the{" "}
            <Link href="/json-validator" className="text-blue-700 underline underline-offset-2">
              validator
            </Link>
            , which reports where the parser stopped, and by the list of{" "}
            <Link
              href="/json-formatter#common-errors"
              className="text-blue-700 underline underline-offset-2"
            >
              common syntax errors
            </Link>
            . The{" "}
            <Link href="/privacy-policy" className="text-blue-700 underline underline-offset-2">
              privacy policy
            </Link>{" "}
            covers what the site does with data, which is nothing beyond serving the page.
          </p>
        </ContentSection>
      </div>
    </div>
  );
}
