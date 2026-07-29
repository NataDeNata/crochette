import { desc, count, and, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { formatPrice } from "@/lib/data/products";
import { lowStockCondition, isLowStock } from "@/lib/db/inventory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { LowStockBadge } from "@/components/admin/LowStockBadge";

const STATUS_VARIANT: Record<string, "default" | "outline" | "destructive"> = {
  active: "default",
  draft: "outline",
  sold_out: "destructive",
};

const PAGE_SIZE = 20;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; stock?: string }>;
}) {
  const sp = await searchParams;
  const stock = sp.stock === "low" ? "low" : "";
  const rawPage = Math.max(1, Number(sp.page) || 1);

  const conditions: SQL[] = [];
  if (stock === "low") conditions.push(lowStockCondition);
  const where = conditions.length ? and(...conditions) : undefined;

  // The second count is unfiltered on purpose — it powers the "Low stock (N)"
  // toggle below, so the filter is discoverable from this page and not only by
  // arriving from the dashboard tile.
  const [[{ total }], [{ lowStockCount }]] = await Promise.all([
    db.select({ total: count() }).from(products).where(where),
    db.select({ lowStockCount: count() }).from(products).where(lowStockCondition),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(rawPage, totalPages);

  const rows = await db
    .select()
    .from(products)
    .where(where)
    .orderBy(desc(products.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-medium">Products</h1>
        <div className="flex items-center gap-2">
          {stock === "low" ? (
            <Button href="/admin/products" variant="outline" size="md">
              Show all
            </Button>
          ) : (
            lowStockCount > 0 && (
              <Button href="/admin/products?stock=low" variant="outline" size="md">
                Low stock ({lowStockCount})
              </Button>
            )
          )}
          <Button href="/admin/products/new" size="md">
            + New product
          </Button>
        </div>
      </div>

      <Card className="p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground capitalize">{p.category.replace("-", " ")}</TableCell>
                  <TableCell>{formatPrice(p.priceCents)}</TableCell>
                  <TableCell className={p.stockQty === 0 ? "text-destructive" : undefined}>
                    <span className="inline-flex items-center gap-2">
                      {p.stockQty}
                      {isLowStock(p) && <LowStockBadge threshold={p.lowStockThreshold} />}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[p.status] ?? "outline"}>{p.status.replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button href={`/admin/products/${p.id}`} variant="ghost" size="sm">
                      Edit
                    </Button>
                    <DeleteProductButton id={p.id} slug={p.slug} name={p.name} />
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    {stock === "low" ? "No products are running low right now." : "No products yet."}
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
        basePath="/admin/products"
        params={{ stock: stock || undefined }}
      />
    </div>
  );
}
