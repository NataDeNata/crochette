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

  /* Pinned to the viewport, not to the panel.
   *
   * It used to sit at `-top-12` — 48px *above* the panel's top edge — which
   * worked only while the panel was a small 4:3 box with a wide band of scrim
   * around it. Now the panel is sized to the viewport, that band is a few
   * percent of the screen height, and on a short viewport (a phone held
   * sideways) 48px of it does not exist: the button would have been clipped
   * off the top of the screen, taking the only visible way out with it.
   *
   * It hangs off the full-screen wrapper instead, so its position does not
   * depend on the panel's size at all. `text-sheet` stays legible because it
   * is over the scrim rather than over the photograph.
   *
   * A bare glyph gave this a ~20x28px hit area — fine for a mouse, well under
   * the 44px touch minimum. The size comes from the box; the glyph is
   * unchanged. */
  const closeButton = (
    <DialogPrimitive.Close asChild>
      <button
        type="button"
        aria-label="Close"
        className="absolute top-3 right-3 z-[1] flex size-11 items-center justify-center border-0 bg-transparent text-[28px] leading-none text-sheet cursor-pointer"
      >
        ×
      </button>
    </DialogPrimitive.Close>
  );

  /* `object-contain`, not `object-cover`.
   *
   * This is the enlarged view — the one surface in the app whose entire job is
   * showing the whole photograph — and `cover` scales the image up until it
   * fills the box, then crops whatever overhangs. Every other photo in this
   * world is deliberately cropped: the figures on the sheet are a uniform
   * 4:5 die-cut, and the gallery mosaic trims to its tile. That is the design.
   * But it means the lightbox was the only way to see a photograph whole, and
   * it was cropping too, so there was no such way at all.
   *
   * `pointer-events-none` because `fill` renders an <img> covering the entire
   * panel, letterbox included. Without it that element swallows every click on
   * what plainly looks like backdrop, and the dead zone grows with the panel.
   * With it, clicks fall through to the panel's own handler below. */
  const panelContent = item.image ? (
    <Image
      src={item.image}
      alt={item.alt ?? ""}
      fill
      sizes="(max-width: 1200px) 92vw, 1200px"
      className="pointer-events-none object-contain"
    />
  ) : (
    <span className="[font-family:ui-monospace,monospace] text-sm text-keyline bg-sheet/70 px-4 py-2 rounded-lg text-center">
      {item.placeholder}
    </span>
  );

  /* The panel is sized to the viewport, not to a fixed 640px 4:3 box.
   *
   * That box was the other half of the same bug, and the worse half: it fixed
   * the *frame's* ratio before `object-fit` was ever consulted, so a 4:5
   * portrait — which is what this catalogue is shot in — lost about a third of
   * its height no matter what. It was also barely an enlargement; 640px wide
   * on a desktop is roughly the size of the plate you clicked to get here.
   *
   * No ratio is imposed now, so the photograph scales to fit whatever shape it
   * actually is. The placeholder case keeps the old compact box: it holds a
   * line of text on a colour field, and stretching that to fill a screen would
   * be a large empty rectangle. */
  const panelClassName = cn(
    "relative flex items-center justify-center",
    item.image
      ? "h-[min(85svh,1000px)] w-[min(1200px,92vw)]"
      : cn(
          "aspect-[4/3] w-[min(640px,90vw)] overflow-hidden rounded-3xl",
          item.bgClassName,
        ),
  );

  // Root's `open` is hardcoded true: this component is only ever rendered
  // (by GallerySection, via AnimatePresence) while the lightbox is open or
  // mid-exit-animation, so Radix's own open/close transition isn't needed —
  // AnimatePresence owns when this whole tree actually leaves the DOM.
  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      {/* `data-surface`/`data-world` are re-stamped on both children below, and
       * that is not decoration — without them this subtree has no colours.
       *
       * Radix's Portal mounts into `document.body`, so everything inside it
       * leaves the `<div data-surface="storefront" data-world="cutout">` that
       * SiteChrome wraps the app in — and every cut-out token (`--keyline`,
       * `--sheet`, `--press-red`) is declared on *that selector*, not on
       * `:root`. A `bg-keyline/70` here would resolve `var(--color-keyline)` to
       * nothing, the declaration would be invalid at computed-value time, and
       * the scrim would paint fully transparent. The literal `oklch(...)` values
       * these classes replaced were immune to that, which is exactly why the
       * substitution needed this and why nothing would have caught it: tsc,
       * eslint and the unit suite are all blind to an unresolved custom
       * property, and the failure is a missing backdrop rather than an error.
       *
       * Anything else in this project that portals and wants a cut-out token
       * has the same requirement. */}
      <DialogPrimitive.Portal forceMount>
        <DialogPrimitive.Overlay asChild forceMount>
          {/* Paint only. This used to carry `onClick={onClose}`, which could
           * never fire — see the note on the Content wrapper below, which
           * covers this element and now owns the backdrop click. Leaving a
           * handler here would read as the thing that closes the lightbox.
           *
           * The scrim is --keyline at 70%, not the literal near-black it was:
           * the close glyph and the caption plate are --sheet and --keyline, so
           * backdrop and content have to come out of one palette or a repaint
           * moves one without the other. */}
          <motion.div
            data-surface="storefront"
            data-world="cutout"
            className="lightbox-scrim fixed inset-0 z-[100]"
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
            data-surface="storefront"
            data-world="cutout"
            className="lightbox-layer fixed inset-0 z-[100] flex items-center justify-center"
            onClick={(e) => e.target === e.currentTarget && onClose()}
          >
            {closeButton}
            <DialogPrimitive.Title className="sr-only">{item.alt || "Gallery image"}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Enlarged gallery image. Press Escape or click to close.
            </DialogPrimitive.Description>
            {/* No `pointer-events-auto` and no `stopPropagation` any more:
             * the first paired with a `pointer-events-none` on the wrapper
             * that Radix was overriding anyway, and the second is redundant
             * now the backdrop handler checks the event target. */}
            {/* No click handler on the panel, deliberately. framer-motion sets
             * `pointer-events: none` inline on a `layoutId` element, so a
             * handler here is unreachable dead code — measured, not assumed.
             * The panel and its image are both transparent to the pointer, so
             * every click inside the panel resolves to the wrapper above and
             * is handled by its `target === currentTarget` test. */}
            <motion.div
              layoutId={layoutId}
              className={panelClassName}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {panelContent}
            </motion.div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
