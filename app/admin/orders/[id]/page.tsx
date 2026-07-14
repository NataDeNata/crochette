import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { formatPrice } from "@/lib/data/products";
import { OrderUpdateForm } from "@/components/admin/OrderUpdateForm";

const fieldStyle = { fontSize: 13.5 } as const;
const labelStyle = { fontSize: 12, color: "oklch(0.5 0.02 60)", marginBottom: 3 } as const;

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) notFound();

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 30, margin: "0 0 4px" }}>
          {order.customerName}
        </h1>
        <a href={`mailto:${order.customerEmail}`} style={{ fontSize: 13.5, color: "oklch(0.5 0.05 20)" }}>
          {order.customerEmail}
        </a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 32, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: 24, borderRadius: 16, border: "1.5px solid oklch(0.9 0.02 60)", background: "oklch(1 0 0)" }}>
          <div>
            <div style={labelStyle}>Items</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
              {items.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", ...fieldStyle }}>
                  <span>
                    {item.productName} × {item.quantity}
                  </span>
                  <span>{formatPrice(item.unitPriceCents * item.quantity)}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={labelStyle}>Subtotal</div>
              <div style={fieldStyle}>{formatPrice(order.subtotalCents)}</div>
            </div>
            <div>
              <div style={labelStyle}>Shipping</div>
              <div style={fieldStyle}>{formatPrice(order.shippingCents)}</div>
            </div>
            <div>
              <div style={labelStyle}>Total</div>
              <div style={fieldStyle}>{formatPrice(order.totalCents)}</div>
            </div>
            <div>
              <div style={labelStyle}>Payment status</div>
              <div style={{ ...fieldStyle, textTransform: "capitalize" }}>{order.status}</div>
            </div>
          </div>

          <div>
            <div style={labelStyle}>Shipping address</div>
            <div style={{ ...fieldStyle, lineHeight: 1.6 }}>
              {order.customerPhone && <div>{order.customerPhone}</div>}
              <div>{order.shippingLine1}</div>
              {order.shippingLine2 && <div>{order.shippingLine2}</div>}
              <div>
                {order.shippingCity}, {order.shippingProvince} {order.shippingPostalCode}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: "oklch(0.55 0.02 60)" }}>
            Placed {order.createdAt.toLocaleString()}
            {order.paidAt && <> · Paid {order.paidAt.toLocaleString()}</>}
          </div>
        </div>

        <div style={{ padding: 24, borderRadius: 16, border: "1.5px solid oklch(0.9 0.02 60)", background: "oklch(1 0 0)" }}>
          <OrderUpdateForm id={order.id} status={order.status} />
        </div>
      </div>
    </div>
  );
}
