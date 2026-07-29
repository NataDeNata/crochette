import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { listAddresses } from "@/lib/db/accounts";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const session = await auth();
  const addresses = session?.user?.role === "customer" ? await listAddresses(session.user.id) : [];

  return (
    <section className="pt-12 px-12 pb-24">
      <h1 className="font-serif font-medium text-[34px] text-center mb-10">Checkout</h1>
      <CheckoutForm
        addresses={addresses.map((a) => ({
          id: a.id,
          label: a.label,
          line1: a.line1,
          line2: a.line2,
          city: a.city,
          province: a.province,
          postalCode: a.postalCode,
        }))}
        defaultName={session?.user?.role === "customer" ? session.user.name ?? "" : ""}
        defaultEmail={session?.user?.role === "customer" ? session.user.email ?? "" : ""}
      />
    </section>
  );
}
