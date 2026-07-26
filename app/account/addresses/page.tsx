import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { listAddresses } from "@/lib/db/accounts";
import { AddressManager } from "@/components/account/AddressManager";

export const metadata: Metadata = {
  title: "Saved addresses",
  robots: { index: false, follow: false },
};

export default async function AccountAddressesPage() {
  const session = await auth();
  const addresses = await listAddresses(session!.user.id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 26, margin: 0 }}>
        Saved addresses
      </h1>
      <AddressManager addresses={addresses} />
    </div>
  );
}
