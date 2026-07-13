import { eq } from "drizzle-orm";
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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 30, margin: 0 }}>
        Edit product
      </h1>
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
        }}
      />
    </div>
  );
}
