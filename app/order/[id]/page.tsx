import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { FadeIn } from "@/components/motion/FadeIn";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { formatPrice } from "@/lib/data/products";

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) notFound();

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  const isPaid = order.status !== "pending" && order.status !== "failed";

  return (
    <section style={{ padding: "64px 48px 96px", maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
      <FadeIn>
        {isPaid ? (
          <>
            <h1 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 36, margin: "0 0 12px" }}>
              Thank you, {order.customerName.split(" ")[0]}!
            </h1>
            <p style={{ fontSize: 14.5, color: "oklch(0.5 0.02 60)", marginBottom: 8 }}>
              Your order is confirmed — we&apos;ll start preparing it soon.
            </p>
          </>
        ) : order.status === "failed" ? (
          <>
            <h1 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 32, margin: "0 0 12px" }}>
              We couldn&apos;t complete this order
            </h1>
            <p style={{ fontSize: 14.5, color: "oklch(0.5 0.02 60)" }}>
              Something went wrong starting checkout — please return to your cart and try again.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 32, margin: "0 0 12px" }}>
              Confirming your payment…
            </h1>
            <p style={{ fontSize: 14.5, color: "oklch(0.5 0.02 60)" }}>
              This usually only takes a few seconds. Refresh this page in a moment, or check your email —
              we&apos;ll send a confirmation there as soon as your payment goes through.
            </p>
          </>
        )}
      </FadeIn>

      {items.length > 0 && (
        <FadeIn delay={0.08}>
          <div
            style={{
              marginTop: 40,
              padding: 24,
              borderRadius: 16,
              border: "1.5px solid oklch(0.9 0.02 60)",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span>
                    {item.productName} <span style={{ color: "oklch(0.55 0.02 60)" }}>× {item.quantity}</span>
                  </span>
                  <span>{formatPrice(item.unitPriceCents * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid oklch(0.92 0.015 60)", display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "oklch(0.5 0.02 60)" }}>
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotalCents)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "oklch(0.5 0.02 60)" }}>
                <span>Shipping</span>
                <span>{formatPrice(order.shippingCents)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 500, marginTop: 4 }}>
                <span>Total</span>
                <span>{formatPrice(order.totalCents)}</span>
              </div>
            </div>
            <div style={{ marginTop: 16, fontSize: 13, color: "oklch(0.5 0.02 60)" }}>
              Shipping to {order.shippingLine1}
              {order.shippingLine2 ? `, ${order.shippingLine2}` : ""}, {order.shippingCity}, {order.shippingProvince}{" "}
              {order.shippingPostalCode}
            </div>
          </div>
        </FadeIn>
      )}
    </section>
  );
}
