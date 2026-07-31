import Link from "next/link";
import { desc, count, and, eq, ilike, or, inArray, type SQL } from "drizzle-orm";
import { Image as ImageIcon, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { productImages, products } from "@/lib/db/schema";
import { formatPrice } from "@/lib/data/products";
import { lowStockCondition, isLowStock } from "@/lib/db/inventory";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSearchBar } from "@/components/admin/AdminSearchBar";
import { AdminFilterTabs } from "@/components/admin/AdminFilterTabs";
import { AdminStatusTag } from "@/components/admin/AdminStatusTag";
import { LowStockBadge } from "@/components/admin/LowStockBadge";

const PAGE_SIZE = 20;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; stock?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const stock = sp.stock === "low" ? "low" : "";
  const rawPage = Math.max(1, Number(sp.page) || 1);

  const conditions: SQL[] = [];
  // Name, slug and description — the three free-text columns. Slug is included
  // because it's what appears in a storefront URL, so pasting one from a
  // customer's message finds the product. `description` is nullable and an
  // `ilike` against NULL yields NULL, which `or` correctly treats as no match.
  if (q) {
    conditions.push(
      or(
        ilike(products.name, `%${q}%`),
        ilike(products.slug, `%${q}%`),
        ilike(products.description, `%${q}%`),
      )!,
    );
  }
  if (stock === "low") conditions.push(lowStockCondition);
  const where = conditions.length ? and(...conditions) : undefined;

  // The second count is unfiltered on purpose — it powers the "Low stock (N)"
  // tab below, so the filter is discoverable from this page and not only by
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

  // Cover photos for just this page's products — an `inArray` over the 20 ids
  // rather than joining the whole product_images table, mirroring how the
  // orders list narrows its item-count subquery. Products photographed but
  // never given a cover simply have no row here and fall back to the
  // placeholder, same as the storefront does.
  const covers = rows.length
    ? await db
        .select({ productId: productImages.productId, url: productImages.url })
        .from(productImages)
        .where(
          and(
            inArray(
              productImages.productId,
              rows.map((r) => r.id),
            ),
            eq(productImages.isPrimary, true),
          ),
        )
    : [];
  const coverByProduct = new Map(covers.map((c) => [c.productId, c.url]));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <AdminPageHeader
        title="Products"
        subtitle="Your catalog & inventory"
        actions={
          <>
            <AdminSearchBar
              basePath="/admin/products"
              q={q}
              searchPlaceholder="Search by name, slug or description…"
              hiddenParams={{ stock: stock || undefined }}
            />
            <Button href="/admin/products/new" size="sm">
              <Plus className="size-3.5" aria-hidden />
              New product
            </Button>
          </>
        }
      />

      <AdminFilterTabs
        basePath="/admin/products"
        param="stock"
        current={stock}
        params={{ q: q || undefined }}
        options={[
          { label: "All" },
          // Hidden when nothing is low, so the tab row never offers a filter
          // that can only produce an empty page.
          ...(lowStockCount > 0 ? [{ value: "low", label: "Low stock", count: lowStockCount }] : []),
        ]}
      />

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {q
              ? "No products match your search."
              : stock === "low"
                ? "No products are running low right now."
                : "No products yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((p) => {
            const cover = coverByProduct.get(p.id);
            return (
              <Card key={p.id} className="h-full">
                <CardContent className="flex h-full flex-col gap-2">
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="flex h-[120px] items-center justify-center overflow-hidden rounded-md bg-muted text-inherit"
                  >
                    {cover ? (
                      /* eslint-disable-next-line @next/next/no-img-element -- Vercel Blob URL,
                         same reasoning as the custom-order reference photos. */
                      <img src={cover} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ImageIcon className="size-3.5" aria-hidden />
                        No photo yet
                      </span>
                    )}
                  </Link>

                  <div className="text-[10px] tracking-[0.1em] text-brand uppercase">
                    {p.category.replace("-", " ")}
                  </div>
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="font-serif text-base leading-snug font-medium text-inherit hover:underline"
                  >
                    {p.name}
                  </Link>

                  <div className="flex flex-1 items-center gap-2 text-[13px]">
                    <span className={p.stockQty === 0 ? "text-destructive" : "text-muted-foreground"}>
                      {p.stockQty} in stock
                    </span>
                    {isLowStock(p) && <LowStockBadge threshold={p.lowStockThreshold} />}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatPrice(p.priceCents)}</span>
                    <AdminStatusTag status={p.status} className="ml-auto flex-none" />
                  </div>

                  <div className="-mx-1 flex items-center gap-1 border-t border-border pt-2">
                    <Button href={`/admin/products/${p.id}`} variant="ghost" size="sm">
                      Edit
                    </Button>
                    <Button href={`/admin/products/${p.id}/images`} variant="ghost" size="sm">
                      Photos
                    </Button>
                    <span className="ml-auto">
                      <DeleteProductButton id={p.id} slug={p.slug} name={p.name} />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AdminPagination
        page={page}
        totalPages={totalPages}
        totalCount={total}
        basePath="/admin/products"
        params={{ q: q || undefined, stock: stock || undefined }}
      />
    </div>
  );
}
