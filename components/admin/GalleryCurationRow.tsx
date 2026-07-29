"use client";

import { useActionState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { addToGallery, removeFromGallery, reorderGalleryImage } from "@/app/admin/gallery/actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";

export function GalleryFeaturedRow({
  id,
  url,
  productName,
  canMoveUp,
  canMoveDown,
}: {
  id: string;
  url: string;
  productName: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [removeState, removeAction] = useActionState(removeFromGallery.bind(null, id), IDLE_STATE);
  const [upState, upAction] = useActionState(reorderGalleryImage.bind(null, id, "up"), IDLE_STATE);
  const [downState, downAction] = useActionState(reorderGalleryImage.bind(null, id, "down"), IDLE_STATE);

  useEffect(() => {
    if (removeState.status === "error" && removeState.message) toast.error(removeState.message);
  }, [removeState]);
  useEffect(() => {
    if (upState.status === "error" && upState.message) toast.error(upState.message);
  }, [upState]);
  useEffect(() => {
    if (downState.status === "error" && downState.message) toast.error(downState.message);
  }, [downState]);

  return (
    <div className="flex items-center gap-4 p-3 rounded-[14px] border-[1.5px] border-[oklch(0.9_0.02_60)]">
      <div className="relative w-16 h-16 shrink-0 rounded-[10px] overflow-hidden bg-[oklch(0.95_0.01_60)]">
        <Image src={url} alt="" fill className="object-cover" sizes="64px" />
      </div>
      <span className="flex-1 text-sm">{productName}</span>
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
      <form action={removeAction}>
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          Remove
        </Button>
      </form>
    </div>
  );
}

export function GalleryAddableRow({ id, url }: { id: string; url: string }) {
  const [state, action, isPending] = useActionState(addToGallery.bind(null, id), IDLE_STATE);

  useEffect(() => {
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  return (
    <div className="flex items-center gap-3 p-2 rounded-[12px] border-[1.5px] border-[oklch(0.9_0.02_60)]">
      <div className="relative w-12 h-12 shrink-0 rounded-[8px] overflow-hidden bg-[oklch(0.95_0.01_60)]">
        <Image src={url} alt="" fill className="object-cover" sizes="48px" />
      </div>
      <form action={action}>
        <Button type="submit" variant="outline" size="sm" disabled={isPending}>
          {isPending ? "Adding…" : "Add"}
        </Button>
      </form>
    </div>
  );
}
