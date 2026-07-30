import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
import { getCustomerDetail } from "@/lib/db/analytics";
import { formatPrice } from "@/lib/data/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusTag } from "@/components/admin/AdminStatusTag";
import { DetailDivider, DetailRow } from "@/components/admin/AdminDetail";

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getCustomerDetail(id);
  if (!detail) notFound();

  const { customer, orders, addresses, paidOrderCount, totalSpentCents } = detail;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <AdminPageHeader
        title={customer.name || customer.email}
        subtitle={customer.name ? customer.email : undefined}
        actions={
          <>
            {/* The design has a "Message" button here. There is no messaging
                backend and building one is well outside a visual redesign, so
                it's a mailto: — which is what the studio owner does anyway. */}
            <Button href={`mailto:${customer.email}`} variant="outline" size="sm">
              <Mail className="size-3.5" aria-hidden />
              Email
            </Button>
            <Button href="/admin/customers" variant="ghost" size="sm">
              <ArrowLeft className="size-3.5" aria-hidden />
              All customers
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <DetailRow label="Email">{customer.email}</DetailRow>
            <DetailRow label="Customer since">{customer.createdAt.toLocaleDateString()}</DetailRow>

            <DetailDivider />

            <div className="flex gap-6">
              <div>
                <div className="text-[11px] text-muted-foreground">Paid orders</div>
                <div className="font-serif text-xl font-medium">{paidOrderCount}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Total spent</div>
                <div className="font-serif text-xl font-medium">{formatPrice(totalSpentCents)}</div>
              </div>
            </div>

            <DetailDivider />

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] text-muted-foreground">Saved addresses</span>
              {addresses.length === 0 ? (
                <span className="text-sm">None saved.</span>
              ) : (
                addresses.map((a) => (
                  <div key={a.id} className="text-sm leading-relaxed">
                    {a.label ? <span className="font-medium">{a.label} </span> : null}
                    {a.isDefault ? (
                      <AdminStatusTag status="default" tone="sage" className="align-middle" />
                    ) : null}
                    <div>{a.line1}</div>
                    {a.line2 ? <div>{a.line2}</div> : null}
                    <div>
                      {a.city}, {a.province} {a.postalCode}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden p-0">
          <CardContent className="p-0">
            <h2 className="m-0 px-4 pt-4 font-serif text-lg font-medium">Order history</h2>
            {orders.length === 0 ? (
              <p className="m-0 px-4 py-6 text-center text-sm text-muted-foreground">
                No orders placed while signed in.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Placed</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="pr-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="pl-4">
                        {/* The public confirmation page, reused as-is — the same
                            thing /account/orders links to for the customer. */}
                        <Link href={`/order/${o.id}`} className="text-inherit hover:underline">
                          {o.createdAt.toLocaleDateString()}
                        </Link>
                      </TableCell>
                      <TableCell>{formatPrice(o.totalCents)}</TableCell>
                      <TableCell className="pr-4">
                        <AdminStatusTag status={o.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
