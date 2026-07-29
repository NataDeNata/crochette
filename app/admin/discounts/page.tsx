import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { discountCodes } from "@/lib/db/schema";
import { formatPrice } from "@/lib/data/products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DeleteDiscountButton } from "@/components/admin/DeleteDiscountButton";

function formatValue(row: { type: "percentage" | "fixed"; value: number }) {
  return row.type === "percentage" ? `${row.value}% off` : `${formatPrice(row.value)} off`;
}

export default async function AdminDiscountsPage() {
  const rows = await db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt));
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-medium">Discount codes</h1>
        <Button href="/admin/discounts/new" size="md">
          + New code
        </Button>
      </div>

      <Card className="p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const expired = row.expiresAt ? row.expiresAt.getTime() < now : false;
                const exhausted = row.maxUses != null && row.usedCount >= row.maxUses;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.code}</TableCell>
                    <TableCell className="text-muted-foreground">{formatValue(row)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.usedCount}
                      {row.maxUses != null ? ` / ${row.maxUses}` : ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant={row.active ? "default" : "outline"}>{row.active ? "Active" : "Inactive"}</Badge>
                        {expired && <Badge variant="destructive">Expired</Badge>}
                        {exhausted && <Badge variant="destructive">Limit reached</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
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
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No discount codes yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
