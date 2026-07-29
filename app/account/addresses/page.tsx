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
    <div className="flex flex-col gap-5">
      <h1 className="font-serif font-medium text-[26px] m-0">Saved addresses</h1>
      <AddressManager addresses={addresses} />
    </div>
  );
}
