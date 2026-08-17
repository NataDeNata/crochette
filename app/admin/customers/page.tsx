import Link from "next/link";
import type { Metadata } from "next";
import { listCustomersWithTotals } from "@/lib/db/analytics";
import { formatPrice } from "@/lib/data/products";
import { formatDate } from "@/lib/data/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearchBar } from "@/components/admin/AdminSearchBar";

export const metadata: Metadata = { title: "Customers", robots: { index: false, follow: false } };

const PAGE_SIZE = 20;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const rawPage = Math.max(1, Number(sp.page) || 1);

  // Unlike the other admin lists, the page clamping lives in the query helper —
  // it owns the count, so it can clamp without a throwaway first query.
  const { rows, total, page, totalPages } = await listCustomersWithTotals({
    page: rawPage,
    pageSize: PAGE_SIZE,
    q: q || undefined,
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <AdminPageHeader
        title="Customers"
        subtitle="Everyone with a Crochette account"
        actions={
          <AdminSearchBar
            basePath="/admin/customers"
            q={q}
            searchPlaceholder="Search by name or email…"
          />
        }
      />

      {/* Stated rather than hidden: orders.customer_id is NULL for guest
          checkout and is never backfilled (Cro_Documentation.md §5), so these
          totals genuinely understate what a person has spent if they ever
          bought without signing in. Better that the owner knows the number's
          scope than trusts a figure that quietly omits guest revenue. */}
      <p className="m-0 text-[13px] text-muted-foreground">
        Totals count orders placed while signed in. Guest checkouts aren&rsquo;t linked to an account, so
        they don&rsquo;t appear here. See <Link href="/admin/orders" className="underline">Orders</Link> for
        every order.
      </p>

      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Paid orders</TableHead>
                <TableHead>Total spent</TableHead>
                <TableHead>Customer since</TableHead>
                <TableHead className="pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="pl-4 font-medium">
                    <Link href={`/admin/customers/${c.id}`} className="text-inherit hover:underline">
                      {c.name || "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell>{c.paidOrderCount}</TableCell>
                  <TableCell>{formatPrice(c.totalSpentCents)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(c.createdAt)}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <Button href={`/admin/customers/${c.id}`} variant="outline" size="sm">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    {q ? "No customers match your search." : "No customer accounts yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AdminPagination
        page={page}
        totalPages={totalPages}
        totalCount={total}
        basePath="/admin/customers"
        params={{ q: q || undefined }}
      />
    </div>
  );
}
