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
    <span className="[font-family:ui-monospace,monospace] text-[11px] text-[oklch(0.35_0.03_60)] bg-[oklch(1_0_0/0.6)] px-2.5 py-[5px] rounded-[6px] text-center">
      {item.placeholder}
    </span>
  );

  const baseClassName = cn(
    "h-full rounded-[18px] overflow-hidden relative flex items-center justify-center",
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
    "w-full cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
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
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
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
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={baseClassName}
    >
      {content}
    </motion.div>
  );
}
