"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateProductImagesMeta } from "@/app/admin/products/images-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { ProductImageRow } from "@/components/admin/ProductImageRow";
import { AdminBusyOverlay } from "@/components/admin/AdminBusyOverlay";
import { SubmitButton } from "@/components/forms/SubmitButton";

type ImageRowData = {
  id: string;
  url: string;
  isPrimary: boolean;
  caption: string;
  alt: string;
};

/** One "Save changes" for every photo's caption/alt on the page, instead of
 * one "Save" per row — see the comment on `updateProductImagesMeta` for why
 * reorder/cover/delete stay separate instant actions inside each row rather
 * than joining this form. */
export function ProductImagesMetaForm({ productId, images }: { productId: string; images: ImageRowData[] }) {
  const [state, formAction, isPending] = useActionState(updateProductImagesMeta.bind(null, productId), IDLE_STATE);

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {isPending && <AdminBusyOverlay label="Saving photo details…" />}

      <div className="flex flex-col gap-3">
        {images.map((image, i) => (
          <ProductImageRow
            key={image.id}
            id={image.id}
            url={image.url}
            isPrimary={image.isPrimary}
            caption={image.caption}
            alt={image.alt}
            canMoveUp={i > 0}
            canMoveDown={i < images.length - 1}
          />
        ))}
      </div>

      {state.status === "error" && state.message && <p className="text-sm text-destructive">{state.message}</p>}

      <SubmitButton isPending={isPending} label="Save changes" pendingLabel="Saving…" />
    </form>
  );
}
