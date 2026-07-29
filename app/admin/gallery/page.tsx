import Link from "next/link";
import { eq, asc, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { productImages, products } from "@/lib/db/schema";
import { GalleryFeaturedRow, GalleryAddableRow } from "@/components/admin/GalleryCurationRow";

export default async function AdminGalleryPage() {
  const rows = await db
    .select({
      id: productImages.id,
      url: productImages.url,
      galleryFeatured: productImages.galleryFeatured,
      galleryOrder: productImages.galleryOrder,
      productId: productImages.productId,
      productName: products.name,
    })
    .from(productImages)
    .innerJoin(products, eq(productImages.productId, products.id))
    .orderBy(asc(products.name), asc(productImages.position));

  const photographedProductIds = [...new Set(rows.map((r) => r.productId))];
  const unphotographedProducts = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(photographedProductIds.length ? notInArray(products.id, photographedProductIds) : undefined)
    .orderBy(asc(products.name));

  const featured = rows.filter((r) => r.galleryFeatured).sort((a, b) => (a.galleryOrder ?? 0) - (b.galleryOrder ?? 0));
  const addable = rows.filter((r) => !r.galleryFeatured);

  const addableByProduct = new Map<string, { productId: string; images: typeof addable }>();
  for (const row of addable) {
    const entry = addableByProduct.get(row.productName) ?? { productId: row.productId, images: [] };
    entry.images.push(row);
    addableByProduct.set(row.productName, entry);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8">
      <div>
        <h1 className="m-0 font-serif text-3xl font-medium">Gallery</h1>
        <p className="mt-1.5 text-[13.5px] text-muted-foreground">
          Gallery photos are uploaded from a product&rsquo;s own photo page, then featured here. To add a brand-new
          photo, open a product below (or from <Link href="/admin/products" className="underline">Products</Link>)
          and upload it there first.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="m-0 font-serif text-xl font-medium">Featured (in order)</h2>
        {featured.length === 0 ? (
          <p className="text-sm text-[oklch(0.55_0.02_60)]">No photos featured yet — add some below.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {featured.map((row, i) => (
              <GalleryFeaturedRow
                key={row.id}
                id={row.id}
                url={row.url}
                productName={row.productName}
                canMoveUp={i > 0}
                canMoveDown={i < featured.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="m-0 font-serif text-xl font-medium">Add from products</h2>
        {addableByProduct.size === 0 ? (
          <p className="text-sm text-[oklch(0.55_0.02_60)]">Every uploaded product photo is already featured.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {[...addableByProduct.entries()].map(([productName, entry]) => (
              <details key={productName} className="rounded-[14px] border-[1.5px] border-[oklch(0.9_0.02_60)] p-4">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-medium">
                  <span>
                    {productName} ({entry.images.length})
                  </span>
                  <Link
                    href={`/admin/products/${entry.productId}/images`}
                    className="text-[13px] font-normal text-[oklch(0.4_0.02_60)] underline"
                  >
                    Upload more →
                  </Link>
                </summary>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {entry.images.map((row) => (
                    <GalleryAddableRow key={row.id} id={row.id} url={row.url} />
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      {unphotographedProducts.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="m-0 font-serif text-xl font-medium">Products without photos yet</h2>
          <div className="flex flex-col gap-2">
            {unphotographedProducts.map((p) => (
              <Link
                key={p.id}
                href={`/admin/products/${p.id}/images`}
                className="flex items-center justify-between rounded-[12px] border-[1.5px] border-[oklch(0.9_0.02_60)] p-3 text-[14.5px] text-inherit"
              >
                <span>{p.name}</span>
                <span className="text-[13px] text-[oklch(0.4_0.02_60)] underline">Upload photos →</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
