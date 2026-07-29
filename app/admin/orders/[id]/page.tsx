import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { formatPrice } from "@/lib/data/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OrderUpdateForm } from "@/components/admin/OrderUpdateForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusTag } from "@/components/admin/AdminStatusTag";
import { DetailBlock, DetailDivider, DetailRow } from "@/components/admin/AdminDetail";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) notFound();

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <AdminPageHeader
        title={order.customerName}
        subtitle={order.customerEmail}
        actions={
          <>
            <AdminStatusTag status={order.status} />
            <Button href="/admin/orders" variant="ghost" size="sm">
              <ArrowLeft className="size-3.5" aria-hidden />
              All orders
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <DetailBlock label="Items">
              <div className="flex flex-col gap-1.5">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-4">
                    <span>
                      {item.productName} × {item.quantity}
                    </span>
                    <span className="flex-none">{formatPrice(item.unitPriceCents * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </DetailBlock>

            <DetailDivider />

            <DetailRow label="Subtotal">{formatPrice(order.subtotalCents)}</DetailRow>
            <DetailRow label="Shipping">{formatPrice(order.shippingCents)}</DetailRow>
            {order.discountCents > 0 && (
              <DetailRow label="Discount">
                <span className="text-sage">−{formatPrice(order.discountCents)}</span>
              </DetailRow>
            )}

            <DetailDivider />

            <div className="flex items-baseline justify-between gap-4 font-semibold">
              <span>Total</span>
              <span>{formatPrice(order.totalCents)}</span>
            </div>

            <DetailDivider />

            <DetailBlock label="Shipping address">
              {order.customerPhone && <div>{order.customerPhone}</div>}
              <div>{order.shippingLine1}</div>
              {order.shippingLine2 && <div>{order.shippingLine2}</div>}
              <div>
                {order.shippingCity}, {order.shippingProvince} {order.shippingPostalCode}
              </div>
            </DetailBlock>

            <p className="m-0 text-[13px] text-muted-foreground">
              Placed {order.createdAt.toLocaleString()}
              {order.paidAt && <> · Paid {order.paidAt.toLocaleString()}</>}
              {order.shippedAt && <> · Shipped {order.shippedAt.toLocaleString()}</>}
              {order.completedAt && <> · Completed {order.completedAt.toLocaleString()}</>}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <OrderUpdateForm
              id={order.id}
              status={order.status}
              trackingNumber={order.trackingNumber}
              carrier={order.carrier}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
