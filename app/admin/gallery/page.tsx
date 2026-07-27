import { eq, asc } from "drizzle-orm";
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
      productName: products.name,
    })
    .from(productImages)
    .innerJoin(products, eq(productImages.productId, products.id))
    .orderBy(asc(products.name), asc(productImages.position));

  const featured = rows.filter((r) => r.galleryFeatured).sort((a, b) => (a.galleryOrder ?? 0) - (b.galleryOrder ?? 0));
  const addable = rows.filter((r) => !r.galleryFeatured);

  const addableByProduct = new Map<string, typeof addable>();
  for (const row of addable) {
    const list = addableByProduct.get(row.productName) ?? [];
    list.push(row);
    addableByProduct.set(row.productName, list);
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif font-medium text-3xl m-0">Gallery</h1>

      <div className="flex flex-col gap-3">
        <h2 className="font-serif font-medium text-xl m-0">Featured (in order)</h2>
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
        <h2 className="font-serif font-medium text-xl m-0">Add from products</h2>
        {addableByProduct.size === 0 ? (
          <p className="text-sm text-[oklch(0.55_0.02_60)]">Every uploaded product photo is already featured.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {[...addableByProduct.entries()].map(([productName, images]) => (
              <details key={productName} className="rounded-[14px] border-[1.5px] border-[oklch(0.9_0.02_60)] p-4">
                <summary className="text-sm font-medium cursor-pointer">
                  {productName} ({images.length})
                </summary>
                <div className="flex flex-wrap gap-2.5 mt-3">
                  {images.map((row) => (
                    <GalleryAddableRow key={row.id} id={row.id} url={row.url} />
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
