import type { Metadata } from "next";
import Link from "next/link";
import { Confirm, PolicyPage, PolicySection } from "@/components/layout/PolicyPage";
import { SHIPPING_CENTS } from "@/lib/cart/constants";
import { formatPrice } from "@/lib/data/products";
import { OG_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms you are agreeing to when you buy from Yarns and Buttons.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms | Yarns and Buttons",
    description: "The terms you are agreeing to when you buy from Yarns and Buttons.",
    images: [OG_IMAGE],
  },
};

export default function TermsPage() {
  return (
    <PolicyPage
      title="Terms"
      summary="What you are agreeing to when you order. Short, because a one-person crochet studio does not need a long one."
      lastReviewed="6 August 2026"
    >
      <PolicySection heading="Who you are buying from">
        <p>
          Yarns and Buttons, a single-owner studio operating from{" "}
          <Confirm>[business address and registration number, if registered]</Confirm>.
          Contact:{" "}
          <a href="mailto:hello@crochette.shop" className="underline">
            hello@crochette.shop
          </a>
          .
        </p>
      </PolicySection>

      <PolicySection heading="Prices and payment">
        <p>
          Every price is in Philippine pesos and includes any tax due. Shipping is a flat{" "}
          {formatPrice(SHIPPING_CENTS)}, shown in your cart before checkout.
        </p>
        <p>
          Your order total is calculated on our side from the current catalogue price
          when you check out, never from anything your browser sends — so the amount you
          are charged is always the amount actually listed.
        </p>
      </PolicySection>

      <PolicySection heading="When an order becomes an order">
        <p>
          Submitting checkout is an offer to buy. It becomes a contract when your
          payment is confirmed and we email you. If a piece turns out to be unavailable
          between those two moments — the risk of stock counted by hand — we will tell
          you and refund you in full.
        </p>
      </PolicySection>

      <PolicySection heading="Custom orders">
        <p>
          A custom request is a request, not a purchase. We reply with a price and a
          timeframe; nothing is made and nothing is charged until you accept. Once you
          accept and work begins, the piece is being made for you specifically — see{" "}
          <Link href="/returns" className="underline">returns</Link> for what that means
          if you change your mind.
        </p>
        <p>
          Reference photographs you upload are used only to make your piece. We will not
          publish them without asking you first.
        </p>
      </PolicySection>

      <PolicySection heading="What handmade means here">
        <p>
          Each piece is made individually, so yours will differ slightly from its
          photograph in shade, size and finish. Sizes are approximate to within{" "}
          <Confirm>1cm</Confirm>.
        </p>
        <p>
          <strong className="text-keyline">Not toys.</strong> These are decorative
          pieces. They contain small parts and long fibres and are not safety-tested for
          children under <Confirm>3</Confirm> — please keep them away from babies and
          from pets that chew.
        </p>
      </PolicySection>

      <PolicySection heading="Accounts">
        <p>
          Keep your password to yourself; anything done through your account is treated
          as done by you. We can close an account that is being used fraudulently or to
          abuse the studio.
        </p>
      </PolicySection>

      <PolicySection heading="Our work is ours">
        <p>
          The photographs, text and designs on this site belong to Yarns and Buttons. Please do
          not reuse them to sell your own work. Buying a piece buys the piece, not the
          pattern or the right to reproduce it commercially.
        </p>
      </PolicySection>

      <PolicySection heading="If something goes wrong">
        <p>
          Nothing here limits your rights under the Philippine Consumer Act, and where
          this page and that law disagree, the law wins. These terms are governed by
          Philippine law.
        </p>
        <p>
          Talk to us first —{" "}
          <Link href="/contact" className="underline">the contact page</Link> reaches the
          person who made your piece.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
