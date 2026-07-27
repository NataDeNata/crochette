import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCustomerOrders, listAddresses } from "@/lib/db/accounts";
import { formatPrice } from "@/lib/data/products";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

export default async function AccountDashboardPage() {
  const session = await auth();
  const customerId = session!.user.id;

  const [orders, addressList] = await Promise.all([getCustomerOrders(customerId), listAddresses(customerId)]);
  const recentOrders = orders.slice(0, 3);
  const defaultAddress = addressList.find((a) => a.isDefault) ?? addressList[0];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-serif font-medium text-3xl mb-1.5">
          Welcome, {(session!.user.name ?? session!.user.email ?? "").split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground m-0">{session!.user.email}</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
        <div className="p-6 rounded-[16px] border-[1.5px] border-[oklch(0.9_0.02_60)]">
          <h2 className="font-serif font-medium text-xl mb-3.5">Recent orders</h2>
          {recentOrders.length === 0 ? (
            <p className="text-[13.5px] text-[oklch(0.55_0.02_60)]">No orders yet.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {recentOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/order/${o.id}`}
                  className="flex justify-between text-[13.5px] text-inherit"
                >
                  <span>
                    {o.createdAt.toLocaleDateString()}{" "}
                    <span className="text-[oklch(0.55_0.02_60)] capitalize">({o.status})</span>
                  </span>
                  <span>{formatPrice(o.totalCents)}</span>
                </Link>
              ))}
            </div>
          )}
          <Link href="/account/orders" className="inline-block mt-4 text-[13px]">
            View all orders →
          </Link>
        </div>

        <div className="p-6 rounded-[16px] border-[1.5px] border-[oklch(0.9_0.02_60)]">
          <h2 className="font-serif font-medium text-xl mb-3.5">Default address</h2>
          {defaultAddress ? (
            <p className="text-[13.5px] text-muted-foreground leading-[1.6] m-0">
              {defaultAddress.line1}
              {defaultAddress.line2 ? `, ${defaultAddress.line2}` : ""}, {defaultAddress.city}, {defaultAddress.province}{" "}
              {defaultAddress.postalCode}
            </p>
          ) : (
            <p className="text-[13.5px] text-[oklch(0.55_0.02_60)]">No saved addresses yet.</p>
          )}
          <Link href="/account/addresses" className="inline-block mt-4 text-[13px]">
            Manage addresses →
          </Link>
        </div>
      </div>
    </div>
  );
}
