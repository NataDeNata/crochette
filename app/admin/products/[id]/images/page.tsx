import { eq, asc } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { products, productImages } from "@/lib/db/schema";
import { ProductImageUploadForm } from "@/components/admin/ProductImageUploadForm";
import { ProductImageRow } from "@/components/admin/ProductImageRow";

export default async function ProductImagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) notFound();

  const images = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, id))
    .orderBy(asc(productImages.position));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif font-medium text-3xl m-0">Photos — {product.name}</h1>
        <Link href={`/admin/products/${product.id}`} className="text-[14.5px] text-[oklch(0.4_0.02_60)] underline">
          ← Back to product
        </Link>
      </div>

      <ProductImageUploadForm productId={product.id} />

      {images.length === 0 ? (
        <p className="text-sm text-[oklch(0.55_0.02_60)]">No photos yet — upload some above.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {images.map((image, i) => (
            <ProductImageRow
              key={image.id}
              id={image.id}
              url={image.url}
              isPrimary={image.isPrimary}
              caption={image.caption ?? ""}
              alt={image.alt ?? ""}
              canMoveUp={i > 0}
              canMoveDown={i < images.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
