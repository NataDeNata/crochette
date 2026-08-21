import { count, desc } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { discountCodes } from "@/lib/db/schema";
import { readPageParam, resolvePage } from "@/lib/db/pagination";
import { formatPrice } from "@/lib/data/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DeleteDiscountButton } from "@/components/admin/DeleteDiscountButton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminStatusTag } from "@/components/admin/AdminStatusTag";

const PAGE_SIZE = 20;

function formatValue(row: { type: "percentage" | "fixed"; value: number }) {
  return row.type === "percentage" ? `${row.value}% off` : `${formatPrice(row.value)} off`;
}

export default async function AdminDiscountsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const requestedPage = readPageParam(sp.page);

  const [{ total }] = await db.select({ total: count() }).from(discountCodes);
  const { page, totalPages, limit, offset } = resolvePage({ total, requestedPage, pageSize: PAGE_SIZE });

  const rows = await db
    .select()
    .from(discountCodes)
    // The `id` tiebreak makes the sort total, which LIMIT/OFFSET requires:
    // `created_at` is not unique, and on a tie one code can come back on two
    // pages while another never appears at all. Full reasoning in
    // app/admin/orders/page.tsx.
    .orderBy(desc(discountCodes.createdAt), desc(discountCodes.id))
    .limit(limit)
    .offset(offset);

  // Read once per request rather than once per row, so every row in a table is
  // judged against the same instant.
  //
  // The purity rule guards against a value changing unpredictably between
  // re-renders. This is an async Server Component: it runs once per request and
  // never re-renders, and "has this code expired?" is inherently a question
  // about now, so there is no hazard here for the rule to prevent.
  // eslint-disable-next-line react-hooks/purity -- async Server Component, see above
  const now = Date.now();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <AdminPageHeader
        title="Discount codes"
        subtitle="Promotions redeemable at checkout"
        actions={
          <Button href="/admin/discounts/new" size="sm">
            <Plus className="size-3.5" aria-hidden />
            New code
          </Button>
        }
      />

      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Code</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const expired = row.expiresAt ? row.expiresAt.getTime() < now : false;
                const exhausted = row.maxUses != null && row.usedCount >= row.maxUses;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="pl-4 font-medium">{row.code}</TableCell>
                    <TableCell className="text-muted-foreground">{formatValue(row)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.usedCount}
                      {row.maxUses != null ? ` / ${row.maxUses}` : ""}
                    </TableCell>
                    <TableCell>
                      {/* These three are derived conditions, not DB enum values, so
                          each passes an explicit `tone` rather than relying on
                          AdminStatusTag's status→tone table. */}
                      <div className="flex flex-wrap gap-1.5">
                        <AdminStatusTag
                          status={row.active ? "active" : "inactive"}
                          tone={row.active ? "sage" : "neutral"}
                        />
                        {expired && <AdminStatusTag status="expired" tone="destructive" />}
                        {exhausted && <AdminStatusTag status="limit reached" tone="destructive" />}
                      </div>
                    </TableCell>
                    <TableCell className="pr-4 text-right whitespace-nowrap">
                      <Button href={`/admin/discounts/${row.id}`} variant="ghost" size="sm">
                        Edit
                      </Button>
                      <DeleteDiscountButton id={row.id} code={row.code} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No discount codes yet.
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
        basePath="/admin/discounts"
        params={{}}
      />
    </div>
  );
}
