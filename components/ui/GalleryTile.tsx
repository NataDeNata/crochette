"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "@/lib/data/gallery";

export function GalleryTile({
  item,
  layoutId,
  onClick,
}: {
  item: GalleryItem;
  layoutId?: string;
  onClick?: () => void;
}) {
  const reduceMotion = useReducedMotion();

  const content = item.image ? (
    <Image
      src={item.image}
      alt={item.alt ?? ""}
      fill
      sizes="(max-width: 760px) 100vw, 33vw"
      className="object-cover"
    />
  ) : (
    <span className="product-card-placeholder-caption text-center">
      {item.placeholder}
    </span>
  );

  /* A plate, not a card: square trim and a 2px key rule, the same weight every
   * other edge on the sheet is printed at. No die-cut corner here — the
   * gallery is the uncut centrefold, and a die-cut would promise a piece for
   * sale. */
  const baseClassName = cn(
    "h-full overflow-hidden relative flex items-center justify-center border-2 border-keyline",
    item.image ? undefined : item.bgClassName,
  );

  /* A tile that opens the lightbox has to be a real <button>, not a div with an
   * onClick. It was the latter for months, which meant the only way to open the
   * gallery on /gallery, the home teaser and the product page was a mouse
   * click — no tab stop, no Enter/Space, nothing announced as interactive
   * (WCAG 2.1.1, level A). The Lightbox it opens is a Radix Dialog and has
   * always been fully accessible once open; the trigger was the whole gap.
   *
   * A non-interactive tile stays a div deliberately. ProductGallery renders
   * <GalleryTile> inside its own thumbnail <button>, and a nested button is
   * invalid HTML — so the element type has to follow `onClick`, not be a
   * button unconditionally. */
  const interactiveClassName = cn(
    baseClassName,
    "w-full cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red",
  );

  /* The image alt already describes the photo; "View" states what activating
   * does, which is the part a screen reader otherwise has to guess. */
  const label = `View ${item.alt ?? item.placeholder}`;

  if (reduceMotion) {
    return onClick ? (
      <button type="button" onClick={onClick} aria-label={label} className={interactiveClassName}>
        {content}
      </button>
    ) : (
      <div className={baseClassName}>{content}</div>
    );
  }

  if (onClick) {
    return (
      <motion.button
        type="button"
        layoutId={layoutId}
        onClick={onClick}
        aria-label={label}
        whileHover={{ y: -4 }}
        whileTap={{ y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className={interactiveClassName}
      >
        {content}
      </motion.button>
    );
  }

  /* Still animates on hover/tap even though it isn't itself interactive:
   * ProductGallery's thumbnails are non-interactive tiles wrapped in their own
   * <button>, so the motion here is the feedback for that button. Dropping it
   * would be a silent visual regression, not part of the a11y fix. */
  return (
    <motion.div
      layoutId={layoutId}
      whileHover={{ y: -4 }}
      whileTap={{ y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={baseClassName}
    >
      {content}
    </motion.div>
  );
}
