import { ProductForm } from "@/components/admin/ProductForm";
import { createProduct } from "@/app/admin/products/actions";

export default function NewProductPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <h1 className="font-serif font-medium text-3xl m-0">New product</h1>
      <ProductForm action={createProduct} submitLabel="Create product" />
    </div>
  );
}
