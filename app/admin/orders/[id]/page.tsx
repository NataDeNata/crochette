import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { formatPrice } from "@/lib/data/products";
import { OrderUpdateForm } from "@/components/admin/OrderUpdateForm";

const fieldClass = "text-[13.5px]";
const labelClass = "text-xs text-muted-foreground mb-[3px]";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) notFound();

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));

  return (
    <div className="flex flex-col gap-6 max-w-[900px]">
      <div>
        <h1 className="font-serif font-medium text-3xl mb-1">{order.customerName}</h1>
        <a href={`mailto:${order.customerEmail}`} className="text-[13.5px] text-[oklch(0.5_0.05_20)]">
          {order.customerEmail}
        </a>
      </div>

      <div className="grid grid-cols-[1.3fr_1fr] gap-8 items-start">
        <div className="flex flex-col gap-5 p-6 rounded-[16px] border-[1.5px] border-[oklch(0.9_0.02_60)] bg-white">
          <div>
            <div className={labelClass}>Items</div>
            <div className="flex flex-col gap-2 mt-1.5">
              {items.map((item) => (
                <div key={item.id} className={`flex justify-between ${fieldClass}`}>
                  <span>
                    {item.productName} × {item.quantity}
                  </span>
                  <span>{formatPrice(item.unitPriceCents * item.quantity)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className={labelClass}>Subtotal</div>
              <div className={fieldClass}>{formatPrice(order.subtotalCents)}</div>
            </div>
            <div>
              <div className={labelClass}>Shipping</div>
              <div className={fieldClass}>{formatPrice(order.shippingCents)}</div>
            </div>
            {order.discountCents > 0 && (
              <div>
                <div className={labelClass}>Discount</div>
                <div className={`${fieldClass} text-[oklch(0.55_0.12_150)]`}>−{formatPrice(order.discountCents)}</div>
              </div>
            )}
            <div>
              <div className={labelClass}>Total</div>
              <div className={fieldClass}>{formatPrice(order.totalCents)}</div>
            </div>
            <div>
              <div className={labelClass}>Payment status</div>
              <div className={`${fieldClass} capitalize`}>{order.status}</div>
            </div>
          </div>

          <div>
            <div className={labelClass}>Shipping address</div>
            <div className={`${fieldClass} leading-[1.6]`}>
              {order.customerPhone && <div>{order.customerPhone}</div>}
              <div>{order.shippingLine1}</div>
              {order.shippingLine2 && <div>{order.shippingLine2}</div>}
              <div>
                {order.shippingCity}, {order.shippingProvince} {order.shippingPostalCode}
              </div>
            </div>
          </div>

          <div className="text-xs text-[oklch(0.55_0.02_60)]">
            Placed {order.createdAt.toLocaleString()}
            {order.paidAt && <> · Paid {order.paidAt.toLocaleString()}</>}
          </div>
        </div>

        <div className="p-6 rounded-[16px] border-[1.5px] border-[oklch(0.9_0.02_60)] bg-white">
          <OrderUpdateForm id={order.id} status={order.status} />
        </div>
      </div>
    </div>
  );
}
