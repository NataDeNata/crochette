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
    <form action={formAction} className="flex flex-col gap-3 p-5 rounded-[16px] border-[1.5px] border-[oklch(0.9_0.02_60)]">
      <PhotoAttach
        name="images"
        maxPhotos={MAX_PRODUCT_IMAGES}
        helpText={`Up to ${MAX_PRODUCT_IMAGES} product photos, JPG/PNG/WebP, 5MB each.`}
      />
      <FieldError error={state.status === "error" ? state.message : undefined} />
      {state.status === "success" && state.message && (
        <span className="text-xs text-[oklch(0.55_0.12_150)]">{state.message}</span>
      )}
      <SubmitButton isPending={isPending} label="Upload photos" pendingLabel="Uploading…" />
    </form>
  );
}
