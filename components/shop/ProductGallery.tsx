"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { GalleryTile } from "@/components/ui/GalleryTile";
import { Lightbox } from "@/components/motion/Lightbox";
import type { GalleryItem } from "@/lib/data/gallery";
import type { ProductImage } from "@/lib/data/products";
import { cn } from "@/lib/utils";

/* The plate: this piece at the size you judge it by.
 *
 * The main image takes the same die-cut card every figure on the sheet does,
 * with the cut line and trim margin around it, so the thing you clicked and
 * the thing you are now looking at are recognisably the same object. The
 * thumbnails are square keyline chips instead — they are a control strip, not
 * more figures, and die-cutting them would say the wrong thing.
 *
 * Two hardcoded cream-palette oklch literals and a monospace placeholder came
 * out of this file. The mono was standing in for "technical", which is the one
 * job this world gives the spec face, not a typewriter.
 */
export function ProductGallery({
  images,
  productName,
  tag,
  bgClassName,
  placeholder,
}: {
  images: ProductImage[];
  productName: string;
  tag?: string;
  bgClassName: string;
  placeholder: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const tagBadge = tag && (
    <div className="type-sheet-spec absolute top-4 left-1/2 z-[2] -translate-x-1/2 border-2 border-keyline bg-butter px-3 py-1.5 text-keyline">
      {tag}
    </div>
  );

  if (images.length === 0) {
    return (
      <div className="relative">
        <div className="diecut-card border-2 border-dashed border-keyline p-1.5">
          <div className="diecut-card border-2 border-keyline bg-sheet p-1.5">
            <div
              className={cn(
                "diecut-card relative flex aspect-4/5 items-end justify-center overflow-hidden",
                bgClassName,
              )}
            >
              {tagBadge}
              <span className="type-sheet-spec mb-8 max-w-[80%] text-center text-keyline">
                {placeholder}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const items: GalleryItem[] = images.map((img) => ({
    image: img.url,
    alt: img.alt || productName,
    placeholder,
    bgClassName,
    span: 1,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <div className="diecut-card border-2 border-dashed border-keyline p-1.5">
          <div className="diecut-card border-2 border-keyline bg-sheet p-1.5">
            <div className="diecut-card relative aspect-4/5 overflow-hidden">
              {tagBadge}
              <GalleryTile
                item={items[activeIndex]}
                layoutId={`product-gallery-${activeIndex}`}
                onClick={() => setOpenIndex(activeIndex)}
              />
            </div>
          </div>
        </div>
      </div>

      {images.length > 1 && (
        <div className="flex flex-wrap gap-2.5">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === activeIndex ? "true" : undefined}
              className={cn(
                "relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden border-2",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red",
                i === activeIndex ? "border-press-red" : "border-keyline",
              )}
            >
              <GalleryTile item={items[i]} />
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {openIndex !== null && (
          <Lightbox
            item={items[openIndex]}
            layoutId={`product-gallery-${openIndex}`}
            onClose={() => setOpenIndex(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
