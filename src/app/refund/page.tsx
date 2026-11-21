import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ContentSection, ProseList } from "@/components/content-section";
import { pageMetadata } from "@/lib/metadata";
import { PRIVACY_LAST_UPDATED, SITE_NAME } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Refund Policy",
  description:
    "How refunds work for the DevTinyTools Pro lifetime licence, including the 14-day window and how to request one.",
  path: "/refund",
});

export default function RefundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Refund Policy" }]} />

      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        Refund Policy
      </h1>
      <p className="mt-2 text-xs text-slate-500">Last updated: {PRIVACY_LAST_UPDATED}</p>
      <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
        This policy covers the optional Pro licence on {SITE_NAME}. The free tools cost
        nothing and need no refund.
      </p>

      <div className="mt-8 space-y-9">
        <ContentSection id="window" title="14-day refund window">
          <p>
            If Pro does not work for you, you can request a full refund within 14 days of
            purchase. After activation, a refund is available when you have not made
            substantial use of the unlocked limits, or when a defect prevents the licence
            from working as described on the tool page.
          </p>
        </ContentSection>

        <ContentSection id="how" title="How to request a refund">
          <p>
            Send a refund request within the window using the contact method below. Include
            the licence key or the order number from your Lemon Squeezy receipt so the
            purchase can be located.
          </p>
          <ProseList
            items={[
              "State the licence key or Lemon Squeezy order number.",
              "Briefly describe the reason for the request.",
              "Keep the receipt; it is the proof of purchase used to verify the order.",
            ]}
          />
          <p className="mt-3">
            Because Lemon Squeezy is the merchant of record, it may also process the refund
            through the receipt it sent you. Either route reaches the same review.
          </p>
        </ContentSection>

        <ContentSection id="processing" title="Processing and timing">
          <p>
            Approved refunds are returned to the original payment method. The time for the
            funds to appear depends on your bank or card issuer and is typically several
            business days. After a refund is issued, the associated licence key is
            deactivated and the unlocked limits stop applying.
          </p>
        </ContentSection>

        <ContentSection id="chargebacks" title="Chargebacks">
          <p>
            Please request a refund before opening a chargeback with your card issuer. A
            chargeback reverses the payment at the processor and takes longer to resolve
            for both sides.
          </p>
        </ContentSection>

        <ContentSection id="contact" title="Contact">
          <p>
            Refund requests and questions can go to the address on the{" "}
            <Link href="/contact" className="text-blue-700 underline underline-offset-2">
              contact page
            </Link>
            . Payment and receipt details are handled by Lemon Squeezy, not by {SITE_NAME}.
          </p>
        </ContentSection>
      </div>
    </div>
  );
}
