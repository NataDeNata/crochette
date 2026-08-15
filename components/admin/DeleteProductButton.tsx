"use client";

import { deleteProduct } from "@/app/admin/products/actions";
import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";

/** No success toast: `deleteProduct` redirects to /admin/products, so this
 * component is gone before one could render. */
export function DeleteProductButton({ id, slug, name }: { id: string; slug: string; name: string }) {
  return <ConfirmDeleteButton action={deleteProduct.bind(null, id, slug)} name={name} />;
}
