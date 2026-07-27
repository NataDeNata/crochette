import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCustomerOrders } from "@/lib/db/accounts";
import { formatPrice } from "@/lib/data/products";

export const metadata: Metadata = {
  title: "Order history",
  robots: { index: false, follow: false },
};

export default async function AccountOrdersPage() {
  const session = await auth();
  const orders = await getCustomerOrders(session!.user.id);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-serif font-medium text-[26px] m-0">Order history</h1>

      {orders.length === 0 ? (
        <p className="text-sm text-[oklch(0.55_0.02_60)]">
          No orders yet — <Link href="/shop">browse the shop</Link>.
        </p>
      ) : (
        <div className="rounded-[16px] border-[1.5px] border-[oklch(0.9_0.02_60)] overflow-hidden">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="text-left bg-[oklch(0.97_0.01_60)]">
                {["Order", "Placed", "Status", "Total"].map((h) => (
                  <th key={h} className="py-3 px-4 font-semibold text-[oklch(0.45_0.02_60)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-[oklch(0.93_0.01_60)]">
                  <td className="py-3 px-4">
                    <Link href={`/order/${o.id}`} className="text-inherit">
                      {o.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-[oklch(0.55_0.02_60)]">{o.createdAt.toLocaleDateString()}</td>
                  <td className="py-3 px-4 capitalize">{o.status}</td>
                  <td className="py-3 px-4 text-muted-foreground">{formatPrice(o.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
