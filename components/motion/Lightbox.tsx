"use client";

import Image from "next/image";
import { Dialog as DialogPrimitive } from "radix-ui";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "@/lib/data/gallery";

export function Lightbox({
  item,
  layoutId,
  onClose,
}: {
  item: GalleryItem;
  layoutId: string;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();

  const closeButton = (
    <DialogPrimitive.Close asChild>
      <button
        type="button"
        aria-label="Close"
        className="absolute -top-11 right-0 bg-transparent border-0 text-[oklch(0.98_0.01_85)] text-[28px] leading-none cursor-pointer"
      >
        ×
      </button>
    </DialogPrimitive.Close>
  );

  const panelContent = item.image ? (
    <Image src={item.image} alt={item.alt ?? ""} fill sizes="90vw" className="object-cover" />
  ) : (
    <span className="[font-family:ui-monospace,monospace] text-sm text-[oklch(0.35_0.03_60)] bg-[oklch(1_0_0/0.7)] px-4 py-2 rounded-lg text-center">
      {item.placeholder}
    </span>
  );

  const panelClassName = cn(
    "relative w-[min(640px,90vw)] aspect-[4/3] rounded-3xl overflow-hidden flex items-center justify-center",
    item.image ? undefined : item.bgClassName,
  );

  // Root's `open` is hardcoded true: this component is only ever rendered
  // (by GallerySection, via AnimatePresence) while the lightbox is open or
  // mid-exit-animation, so Radix's own open/close transition isn't needed —
  // AnimatePresence owns when this whole tree actually leaves the DOM.
  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal forceMount>
        <DialogPrimitive.Overlay asChild forceMount>
          <motion.div
            className="fixed inset-0 z-[100] bg-[oklch(0.2_0.02_60/0.7)]"
            onClick={onClose}
            initial={reduceMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        </DialogPrimitive.Overlay>
        <DialogPrimitive.Content
          asChild
          forceMount
          onOpenAutoFocus={(e) => reduceMotion && e.preventDefault()}
        >
          <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
            <DialogPrimitive.Title className="sr-only">{item.alt || "Gallery image"}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Enlarged gallery image. Press Escape or click outside to close.
            </DialogPrimitive.Description>
            <motion.div
              layoutId={layoutId}
              onClick={(e) => e.stopPropagation()}
              className={cn(panelClassName, "pointer-events-auto")}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {closeButton}
              {panelContent}
            </motion.div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
