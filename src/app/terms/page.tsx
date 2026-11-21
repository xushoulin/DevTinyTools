import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ContentSection, ProseList } from "@/components/content-section";
import { pageMetadata } from "@/lib/metadata";
import { PRO_PRICE_LIFETIME, getProCheckoutUrl } from "@/lib/pro";
import { PRIVACY_LAST_UPDATED, SITE_NAME } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Terms of Sale",
  description:
    "Terms for the optional DevTinyTools Pro licence: what it includes, how activation works, and the conditions of sale.",
  path: "/terms",
});

export default function TermsPage() {
  const checkout = getProCheckoutUrl();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Terms of Sale" }]} />

      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        Terms of Sale
      </h1>
      <p className="mt-2 text-xs text-slate-500">Last updated: {PRIVACY_LAST_UPDATED}</p>
      <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
        These terms apply to the optional paid Pro licence on {SITE_NAME}. The free tools
        are covered by the general{" "}
        <Link href="/about" className="text-blue-700 underline underline-offset-2">
          about page
        </Link>{" "}
        and need no purchase. By activating a licence you agree to the terms below.
      </p>

      <div className="mt-8 space-y-9">
        <ContentSection id="what-is-sold" title="What you are buying">
          <p>
            Pro is a one-time licence to raise the per-document limits of the conversion and
            diff tools in your own browser. The current price is {PRO_PRICE_LIFETIME} for a
            lifetime licence. It is not a subscription: there is no recurring charge and the
            unlocked limits do not expire.
          </p>
          <ProseList
            items={[
              "Higher input limits on the JSON converters and JSON Diff.",
              "Activation on the number of devices stated at checkout.",
              "Free updates to the Pro features during the licence lifetime.",
            ]}
          />
        </ContentSection>

        <ContentSection id="merchant" title="Payments and the merchant of record">
          <p>
            Checkout is hosted by Lemon Squeezy, which acts as merchant of record. It
            processes your payment, collects and remits VAT and sales tax, and its terms and
            privacy policy govern the payment transaction. {SITE_NAME} never receives your
            card number or billing details — only the result of the activation check.
          </p>
          {checkout ? (
            <p>
              The live checkout is linked from the Pro section of each eligible tool page.
            </p>
          ) : (
            <p>
              Checkout is not currently wired up, so no purchase can be completed on this
              site.
            </p>
          )}
        </ContentSection>

        <ContentSection id="activation" title="Activation and licence keys">
          <p>
            After purchase you receive a licence key. Enter it in the licence dialog on an
            eligible tool page to activate Pro. Activation is verified against the Lemon
            Squeezy API and the resulting licence key, instance identifier and activation
            time are stored in this browser&apos;s local storage. The key is tied to an
            activation limit; if you reach it, deactivate the key on another device first.
          </p>
          <p>
            Do not share your licence key. A key that is published or distributed may be
            deactivated.
          </p>
        </ContentSection>

        <ContentSection id="refunds" title="Refunds">
          <p>
            Refund requests are handled under the{" "}
            <Link href="/refund" className="text-blue-700 underline underline-offset-2">
              refund policy
            </Link>
            , which applies to every Pro purchase.
          </p>
        </ContentSection>

        <ContentSection id="liability" title="Software provided as is">
          <p>
            The tools and the Pro tier are provided as is, without warranty of any kind. The
            software runs in your browser and processes data locally; it is your
            responsibility to keep copies of anything you paste. To the extent permitted by
            law, {SITE_NAME} is not liable for data loss or for indirect or consequential
            damages arising from use of the tools.
          </p>
        </ContentSection>

        <ContentSection id="changes" title="Changes to these terms">
          <p>
            These terms may be updated when the Pro features or the checkout arrangement
            change. The date at the top of the page indicates the current version. Changes
            do not reduce the lifetime entitlement of a licence already purchased.
          </p>
        </ContentSection>

        <ContentSection id="contact" title="Contact">
          <p>
            Questions about these terms can go to the address on the{" "}
            <Link href="/contact" className="text-blue-700 underline underline-offset-2">
              contact page
            </Link>
            . For payment-specific questions, use the support channel provided by Lemon
            Squeezy in your purchase receipt.
          </p>
        </ContentSection>
      </div>
    </div>
  );
}
