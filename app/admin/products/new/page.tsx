import { ProductForm } from "@/components/admin/ProductForm";
import { createProduct } from "@/app/admin/products/actions";

export default function NewProductPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 30, margin: 0 }}>
        New product
      </h1>
      <ProductForm action={createProduct} submitLabel="Create product" />
    </div>
  );
}
