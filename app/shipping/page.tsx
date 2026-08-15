import type { Metadata } from "next";
import Link from "next/link";
import { Confirm, PolicyPage, PolicySection } from "@/components/layout/PolicyPage";
import { SHIPPING_CENTS } from "@/lib/cart/constants";
import { formatPrice } from "@/lib/data/products";
import { OG_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Shipping",
  description:
    "How long a handmade piece takes to make, how it ships, and what it costs to get it to you.",
  alternates: { canonical: "/shipping" },
  openGraph: {
    title: "Shipping | Crochette",
    description:
      "How long a handmade piece takes to make, how it ships, and what it costs to get it to you.",
    images: [OG_IMAGE],
  },
};

export default function ShippingPage() {
  return (
    <PolicyPage
      title="Shipping"
      summary="Everything here is made by one person, so a piece takes longer to reach you than something pulled off a warehouse shelf. Here is what that actually means in days."
      lastReviewed="6 August 2026"
    >
      <PolicySection heading="What it costs">
        <p>
          A flat {formatPrice(SHIPPING_CENTS)} anywhere in the Philippines, however many
          pieces are in your order. It is shown in your cart before you reach checkout,
          so the total you see is the total you pay — there is no charge added at the
          final step.
        </p>
        <p>
          We do not ship internationally yet. If you are outside the Philippines and
          want a piece, <Link href="/contact" className="underline">write to us</Link>{" "}
          and we will tell you honestly whether we can arrange it.
        </p>
      </PolicySection>

      <PolicySection heading="How long it takes">
        <p>
          <strong className="text-keyline">Pieces in stock</strong> are already made and
          waiting. They are packed and handed to the courier within{" "}
          <Confirm>1–2 working days</Confirm> of your payment clearing.
        </p>
        <p>
          <strong className="text-keyline">Custom orders</strong> are made from scratch
          after you approve the quote. Most take <Confirm>2–3 weeks</Confirm> depending
          on size and how many are ahead of yours. You will be given a real estimate with
          your quote rather than a generic one.
        </p>
        <p>
          Courier transit is typically <Confirm>2–4 days within Metro Manila and 3–7
          days elsewhere</Confirm>. Remote areas and the weeks around Christmas run
          longer, and no courier here is reliable to the day.
        </p>
      </PolicySection>

      <PolicySection heading="Tracking">
        <p>
          When your order is handed over you get an email with the courier and the
          tracking number. If you made the order while signed in, it is also on your{" "}
          <Link href="/account/orders" className="underline">orders page</Link>.
        </p>
        <p>
          Guest orders are tracked by the confirmation email alone, so keep it. Signing
          up later with the same email address attaches those orders to your account
          automatically.
        </p>
      </PolicySection>

      <PolicySection heading="If something goes wrong">
        <p>
          A parcel that has not moved for <Confirm>7 days</Confirm>, or that arrives
          damaged, is our problem to solve and not yours to chase.{" "}
          <Link href="/contact" className="underline">Tell us</Link> with your order
          number and, if it is damage, a photograph. See{" "}
          <Link href="/returns" className="underline">returns</Link> for what happens
          next.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
