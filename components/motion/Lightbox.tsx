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
      {/* A bare glyph gave this a ~20x28px hit area — fine for a mouse, well
          under the 44px touch minimum. The size comes from the box now; the
          glyph itself is unchanged. */}
      <button
        type="button"
        aria-label="Close"
        className="absolute -top-12 right-0 flex size-11 items-center justify-center bg-transparent border-0 text-[oklch(0.98_0.01_85)] text-[28px] leading-none cursor-pointer"
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
          {/* Paint only. This used to carry `onClick={onClose}`, which could
           * never fire — see the note on the Content wrapper below, which
           * covers this element and now owns the backdrop click. Leaving a
           * handler here would read as the thing that closes the lightbox. */}
          <motion.div
            className="fixed inset-0 z-[100] bg-[oklch(0.2_0.02_60/0.7)]"
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
          {/* The backdrop click closes from *here*, not from the Overlay.
           *
           * The Overlay used to carry the `onClick` and it could never fire,
           * because this element covers it: Radix's DismissableLayer sets
           * `pointer-events: auto` **inline** on Content in modal mode, which
           * silently beat the `pointer-events-none` class this used to carry —
           * the same inline-style-defeats-a-class footgun recorded in the
           * project notes, arriving this time from a library rather than from
           * our own markup. So the full-screen wrapper sat on top of the
           * overlay, swallowed every click on the dark area, and did nothing
           * with them. Escape worked, clicking out did not.
           *
           * Radix's own `onPointerDownOutside` is not the fix: Content *is*
           * this full-screen element, so a click on the backdrop is inside it
           * by Radix's reckoning and that handler never fires.
           *
           * `target === currentTarget` rather than a `stopPropagation` on the
           * panel — it asserts the click landed on the backdrop itself instead
           * of relying on every descendant to stop bubbling, so adding a
           * control inside the panel later cannot silently start closing it. */}
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            onClick={(e) => e.target === e.currentTarget && onClose()}
          >
            <DialogPrimitive.Title className="sr-only">{item.alt || "Gallery image"}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Enlarged gallery image. Press Escape or click outside to close.
            </DialogPrimitive.Description>
            {/* No `pointer-events-auto` and no `stopPropagation` any more:
             * the first paired with a `pointer-events-none` on the wrapper
             * that Radix was overriding anyway, and the second is redundant
             * now the backdrop handler checks the event target. */}
            <motion.div
              layoutId={layoutId}
              className={panelClassName}
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
