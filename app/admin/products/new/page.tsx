import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/ProductForm";
import { createProduct } from "@/app/admin/products/actions";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireAdminPage } from "@/lib/auth-guard";

export default async function NewProductPage() {
  await requireAdminPage();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <AdminPageHeader
        title="New product"
        actions={
          <Button href="/admin/products" variant="ghost" size="sm">
            <ArrowLeft className="size-3.5" aria-hidden />
            All products
          </Button>
        }
      />
      <ProductForm action={createProduct} submitLabel="Create product" />
    </div>
  );
}
