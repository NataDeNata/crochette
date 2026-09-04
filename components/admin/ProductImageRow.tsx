"use client";

import { useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { X } from "lucide-react";
import {
  deleteProductImage,
  reorderProductImage,
  setPrimaryProductImage,
} from "@/app/admin/products/images-actions";
import { IDLE_STATE, type FormActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

/** Reorder, cover and delete are instant per-row actions — called directly
 * rather than through a `<form>`, so they can sit inside the page-level form
 * ProductImagesMetaForm wraps this row in without nesting one `<form>`
 * inside another. Caption/alt stay plain named inputs that outer form reads
 * on submit; this component holds no state for them. */
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
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<FormActionState>) {
    startTransition(async () => {
      const result = await action();
      if (result.status === "error" && result.message) toast.error(result.message);
    });
  }

  return (
    <div className="flex gap-4 rounded-xl border border-border bg-card p-4">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-muted">
        <Image src={url} alt={alt || "Product photo"} fill className="object-cover" sizes="96px" />
        {isPrimary && (
          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-primary text-card text-[10px] leading-none">
            Cover
          </span>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              disabled={isPending}
              aria-label="Delete photo"
              className="absolute -right-1.5 -top-1.5 flex size-6 cursor-pointer items-center justify-center rounded-full border-2 border-card bg-destructive text-destructive-foreground transition-colors duration-150 hover:bg-destructive/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
              <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() => run(() => deleteProductImage(id, IDLE_STATE, new FormData()))}
              >
                {isPending ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <input type="hidden" name="imageId" value={id} />
        <Input name={`caption-${id}`} placeholder="Caption (optional)" defaultValue={caption} />
        <Input name={`alt-${id}`} placeholder="Alt text (optional)" defaultValue={alt} />
      </div>

      <div className="flex flex-col gap-1.5 shrink-0">
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canMoveUp || isPending}
            aria-label="Move up"
            onClick={() => run(() => reorderProductImage(id, "up", IDLE_STATE, new FormData()))}
          >
            ↑
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canMoveDown || isPending}
            aria-label="Move down"
            onClick={() => run(() => reorderProductImage(id, "down", IDLE_STATE, new FormData()))}
          >
            ↓
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPrimary || isPending}
          className="w-full"
          onClick={() => run(() => setPrimaryProductImage(id, IDLE_STATE, new FormData()))}
        >
          {isPrimary ? "Cover photo" : "Set as cover"}
        </Button>
      </div>
    </div>
  );
}
