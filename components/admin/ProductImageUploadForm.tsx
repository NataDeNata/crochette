"use client";

import { useActionState } from "react";
import { uploadProductImages } from "@/app/admin/products/images-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { MAX_PRODUCT_IMAGES } from "@/lib/validation/product-images";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";
import { PhotoAttach } from "@/components/custom/PhotoAttach";

export function ProductImageUploadForm({ productId }: { productId: string }) {
  const action = uploadProductImages.bind(null, productId);
  const [state, formAction, isPending] = useActionState(action, IDLE_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <PhotoAttach
        name="images"
        maxPhotos={MAX_PRODUCT_IMAGES}
        helpText={`Up to ${MAX_PRODUCT_IMAGES} product photos, JPG/PNG/WebP, 5MB each.`}
      />
      <FieldError error={state.status === "error" ? state.message : undefined} />
      {state.status === "success" && state.message && (
        <span className="text-xs text-sage">{state.message}</span>
      )}
      <SubmitButton isPending={isPending} label="Upload photos" pendingLabel="Uploading…" />
    </form>
  );
}
