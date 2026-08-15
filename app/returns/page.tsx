import type { Metadata } from "next";
import Link from "next/link";
import { Confirm, PolicyPage, PolicySection } from "@/components/layout/PolicyPage";
import { OG_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Returns",
  description:
    "What to do if a piece arrives damaged, is not what you ordered, or simply is not right.",
  alternates: { canonical: "/returns" },
  openGraph: {
    title: "Returns | Crochette",
    description:
      "What to do if a piece arrives damaged, is not what you ordered, or simply is not right.",
    images: [OG_IMAGE],
  },
};

export default function ReturnsPage() {
  return (
    <PolicyPage
      title="Returns and refunds"
      summary="Handmade does not mean final sale. If a piece arrives damaged or is not what you ordered, that is ours to fix — and this page says plainly what happens in each case."
      lastReviewed="6 August 2026"
    >
      <PolicySection heading="Damaged, faulty, or not what you ordered">
        <p>
          Tell us within <Confirm>7 days</Confirm> of the parcel arriving, with your
          order number and a photograph. You choose: a replacement, a repair, or a full
          refund including the shipping you paid. We cover the cost of sending it back.
        </p>
        <p>
          This is your right under the Philippine Consumer Act, and nothing on this page
          reduces it.
        </p>
      </PolicySection>

      <PolicySection heading="Changed your mind">
        <p>
          Ready-made pieces can come back within <Confirm>7 days</Confirm> of arriving,
          unused and in the state they reached you, for a refund of the item price. The
          return postage is yours in this case, and the original shipping is not
          refunded.
        </p>
        <p>
          Send us a message first — a parcel that arrives back with no warning is hard
          to match to an order.
        </p>
      </PolicySection>

      <PolicySection heading="Custom orders">
        <p>
          A commission is made to your own brief, in your colours, at your size, and
          cannot be resold to anyone else. So a custom piece cannot be returned simply
          because you changed your mind.
        </p>
        <p>
          It can absolutely be returned if it arrives damaged, or if it does not match
          the brief you approved — that is a fault, not a change of mind, and is covered
          in full above. This is why the quote stage exists: nothing is started until
          you have agreed what is being made.
        </p>
      </PolicySection>

      <PolicySection heading="How a refund reaches you">
        <p>
          Refunds go back to the method you paid with, through the same payment
          provider. We start it within <Confirm>3 working days</Confirm> of agreeing the
          return; how long it then takes to appear is the bank or e-wallet&apos;s
          timeline, usually <Confirm>5–10 working days</Confirm>.
        </p>
      </PolicySection>

      <PolicySection heading="One thing that is not a fault">
        <p>
          No two pieces are identical. Yarn dye lots vary, and a piece stitched by hand
          will differ slightly from its photograph — that is the honest version of
          handmade and the reason each one is worth having. A difference of that kind is
          not a fault. A piece that is the wrong size, the wrong colour family, or badly
          finished is.
        </p>
      </PolicySection>

      <PolicySection heading="Start a return">
        <p>
          Message us through the{" "}
          <Link href="/contact" className="underline">contact page</Link> or reply to
          your confirmation email, with the order number in either.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
