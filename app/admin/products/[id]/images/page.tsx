import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { products, productImages } from "@/lib/db/schema";
import { ProductImageUploadForm } from "@/components/admin/ProductImageUploadForm";
import { ProductImagesMetaForm } from "@/components/admin/ProductImagesMetaForm";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <AdminPageHeader
        title="Photos"
        subtitle={product.name}
        actions={
          <Button href={`/admin/products/${product.id}`} variant="ghost" size="sm">
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to product
          </Button>
        }
      />

      <ProductImageUploadForm productId={product.id} />

      {images.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">No photos yet. Upload some above.</p>
      ) : (
        <ProductImagesMetaForm
          productId={product.id}
          images={images.map((image) => ({
            id: image.id,
            url: image.url,
            isPrimary: image.isPrimary,
            caption: image.caption ?? "",
            alt: image.alt ?? "",
          }))}
        />
      )}
    </div>
  );
}
