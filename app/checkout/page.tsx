import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <section style={{ padding: "48px 48px 96px" }}>
      <h1 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 34, textAlign: "center", margin: "0 0 40px" }}>
        Checkout
      </h1>
      <CheckoutForm />
    </section>
  );
}
