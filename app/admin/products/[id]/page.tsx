import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { ProductForm } from "@/components/admin/ProductForm";
import { updateProduct } from "@/app/admin/products/actions";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif font-medium text-3xl m-0">Edit product</h1>
        <Link href={`/admin/products/${product.id}/images`} className="text-[14.5px] text-[oklch(0.4_0.02_60)] underline">
          Manage photos →
        </Link>
      </div>
      <ProductForm
        action={updateProduct.bind(null, product.id)}
        submitLabel="Save changes"
        defaults={{
          name: product.name,
          slug: product.slug,
          description: product.description ?? "",
          priceDollars: (product.priceCents / 100).toFixed(2),
          category: product.category,
          tag: product.tag ?? "",
          status: product.status,
          stockQty: String(product.stockQty),
          lowStockThreshold: String(product.lowStockThreshold),
        }}
      />
    </div>
  );
}
