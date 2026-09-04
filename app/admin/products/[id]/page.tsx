import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, Images } from "lucide-react";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { ProductForm } from "@/components/admin/ProductForm";
import { updateProduct } from "@/app/admin/products/actions";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) notFound();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <AdminPageHeader
        title="Edit product"
        subtitle={product.name}
        actions={
          <>
            <Button href={`/admin/products/${product.id}/images`} variant="outline" size="sm">
              <Images className="size-3.5" aria-hidden />
              Photos
            </Button>
            <Button href="/admin/products" variant="ghost" size="sm">
              <ArrowLeft className="size-3.5" aria-hidden />
              All products
            </Button>
          </>
        }
      />
      <ProductForm
        action={updateProduct.bind(null, product.id)}
        submitLabel="Save changes"
        defaults={{
          name: product.name,
          slug: product.slug,
          description: product.description ?? "",
          priceDollars: (product.priceCents / 100).toFixed(2),
          category: product.category,
          status: product.status,
          stockQty: String(product.stockQty),
          lowStockThreshold: String(product.lowStockThreshold),
          dimensions: product.dimensions ?? "",
          materials: product.materials ?? "",
          careInstructions: product.careInstructions ?? "",
        }}
      />
    </div>
  );
}
