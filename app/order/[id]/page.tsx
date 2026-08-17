import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { FadeIn } from "@/components/motion/FadeIn";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { formatPrice } from "@/lib/data/products";

export const metadata: Metadata = {
  title: "Order confirmation",
  robots: { index: false, follow: false },
};

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) notFound();

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  const isPaid = order.status !== "pending" && order.status !== "failed";

  return (
    <section className="pt-16 page-gutter pb-24 max-w-[640px] mx-auto text-center">
      <FadeIn>
        {isPaid ? (
          <>
            <h1 className="font-serif font-medium text-4xl mb-3">
              Thank you, {order.customerName.split(" ")[0]}!
            </h1>
            <p className="text-[14.5px] text-muted-foreground mb-2">
              Your order is confirmed. We&apos;ll start preparing it soon.
            </p>
          </>
        ) : order.status === "failed" ? (
          <>
            <h1 className="font-serif font-medium text-[32px] mb-3">
              We couldn&apos;t complete this order
            </h1>
            <p className="text-[14.5px] text-muted-foreground">
              Something went wrong starting checkout. Please return to your cart and try again.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-serif font-medium text-[32px] mb-3">
              Confirming your payment…
            </h1>
            <p className="text-[14.5px] text-muted-foreground">
              This usually only takes a few seconds. Refresh this page in a moment, or check your
              email. We&apos;ll send a confirmation there as soon as your payment goes through.
            </p>
          </>
        )}
      </FadeIn>

      {items.length > 0 && (
        <FadeIn delay={0.08}>
          <div className="mt-10 p-6 rounded-[16px] border-[1.5px] border-keyline/15 text-left">
            <div className="flex flex-col gap-2.5">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.productName} <span className="text-muted-foreground">× {item.quantity}</span>
                  </span>
                  <span>{formatPrice(item.unitPriceCents * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3.5 border-t border-keyline/15 flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>{formatPrice(order.shippingCents)}</span>
              </div>
              {order.discountCents > 0 && (
                <div className="flex justify-between text-sage">
                  <span>Discount</span>
                  <span>−{formatPrice(order.discountCents)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-medium mt-1">
                <span>Total</span>
                <span>{formatPrice(order.totalCents)}</span>
              </div>
            </div>
            <div className="mt-4 text-[13px] text-muted-foreground">
              Shipping to {order.shippingLine1}
              {order.shippingLine2 ? `, ${order.shippingLine2}` : ""}, {order.shippingCity}, {order.shippingProvince}{" "}
              {order.shippingPostalCode}
            </div>
            {(order.carrier || order.trackingNumber) && (
              <div className="mt-2 text-[13px] text-muted-foreground">
                {order.carrier && <>Carrier: {order.carrier}</>}
                {order.carrier && order.trackingNumber && " · "}
                {order.trackingNumber && <>Tracking number: {order.trackingNumber}</>}
              </div>
            )}
          </div>
        </FadeIn>
      )}
    </section>
  );
}
