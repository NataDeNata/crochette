import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { formatPrice } from "@/lib/data/products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";

const STATUS_VARIANT: Record<string, "default" | "outline" | "destructive"> = {
  active: "default",
  draft: "outline",
  sold_out: "destructive",
};

export default async function AdminProductsPage() {
  const rows = await db.select().from(products).orderBy(desc(products.createdAt));

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-medium">Products</h1>
        <Button href="/admin/products/new" size="md">
          + New product
        </Button>
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
                  <TableCell className={p.stockQty === 0 ? "text-destructive" : undefined}>{p.stockQty}</TableCell>
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
                    No products yet.
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
