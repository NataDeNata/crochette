"use client";

import { useActionState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  deleteProductImage,
  reorderProductImage,
  setPrimaryProductImage,
  updateProductImageMeta,
} from "@/app/admin/products/images-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/forms/FieldError";
import { SubmitButton } from "@/components/forms/SubmitButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ProductImageRow({
  id,
  url,
  isPrimary,
  caption,
  alt,
  canMoveUp,
  canMoveDown,
}: {
  id: string;
  url: string;
  isPrimary: boolean;
  caption: string;
  alt: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [metaState, metaAction, metaPending] = useActionState(updateProductImageMeta.bind(null, id), IDLE_STATE);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteProductImage.bind(null, id), IDLE_STATE);
  const [primaryState, primaryAction] = useActionState(setPrimaryProductImage.bind(null, id), IDLE_STATE);
  const [upState, upAction] = useActionState(reorderProductImage.bind(null, id, "up"), IDLE_STATE);
  const [downState, downAction] = useActionState(reorderProductImage.bind(null, id, "down"), IDLE_STATE);

  useEffect(() => {
    if (deleteState.status === "error" && deleteState.message) toast.error(deleteState.message);
  }, [deleteState]);
  useEffect(() => {
    if (primaryState.status === "error" && primaryState.message) toast.error(primaryState.message);
  }, [primaryState]);
  useEffect(() => {
    if (upState.status === "error" && upState.message) toast.error(upState.message);
  }, [upState]);
  useEffect(() => {
    if (downState.status === "error" && downState.message) toast.error(downState.message);
  }, [downState]);

  const metaFieldErrors = metaState.fieldErrors ?? {};

  return (
    <div className="flex gap-4 p-4 rounded-[14px] border-[1.5px] border-[oklch(0.9_0.02_60)]">
      <div className="relative w-24 h-24 shrink-0 rounded-[10px] overflow-hidden bg-[oklch(0.95_0.01_60)]">
        <Image src={url} alt={alt || "Product photo"} fill className="object-cover" sizes="96px" />
        {isPrimary && (
          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-primary text-card text-[10px] leading-none">
            Cover
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <form action={metaAction} className="flex flex-col gap-2">
          <div>
            <Input name="caption" placeholder="Caption (optional)" defaultValue={caption} />
            <FieldError error={metaFieldErrors.caption?.[0]} />
          </div>
          <div>
            <Input name="alt" placeholder="Alt text (optional)" defaultValue={alt} />
            <FieldError error={metaFieldErrors.alt?.[0]} />
          </div>
          <div className="flex items-center gap-2">
            <SubmitButton isPending={metaPending} label="Save" pendingLabel="Saving…" />
            {metaState.status === "success" && <span className="text-xs text-[oklch(0.55_0.12_150)]">Saved.</span>}
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-1.5 shrink-0">
        <div className="flex gap-1.5">
          <form action={upAction}>
            <Button type="submit" variant="outline" size="sm" disabled={!canMoveUp} aria-label="Move up">
              ↑
            </Button>
          </form>
          <form action={downAction}>
            <Button type="submit" variant="outline" size="sm" disabled={!canMoveDown} aria-label="Move down">
              ↓
            </Button>
          </form>
        </div>
        <form action={primaryAction}>
          <Button type="submit" variant="outline" size="sm" disabled={isPrimary} className="w-full">
            {isPrimary ? "Cover photo" : "Set as cover"}
          </Button>
        </form>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
              <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <form action={deleteAction}>
                <AlertDialogAction type="submit" variant="destructive" disabled={deletePending}>
                  {deletePending ? "Deleting…" : "Delete"}
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
