"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { GalleryTile } from "@/components/ui/GalleryTile";
import { Lightbox } from "@/components/motion/Lightbox";
import type { GalleryItem } from "@/lib/data/gallery";
import type { ProductImage } from "@/lib/data/products";
import { cn } from "@/lib/utils";

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
    <div className="absolute top-[18px] left-[18px] z-[1] bg-[oklch(0.98_0.01_85/0.9)] py-1.5 px-3.5 rounded-[16px] text-xs tracking-[0.5px] uppercase font-semibold text-[oklch(0.5_0.09_20)]">
      {tag}
    </div>
  );

  if (images.length === 0) {
    return (
      <div
        className={cn(
          "relative aspect-square rounded-[28px] overflow-hidden flex items-center justify-center",
          bgClassName
        )}
      >
        {tagBadge}
        <span className="[font-family:ui-monospace,monospace] text-[13px] text-[oklch(0.35_0.03_60)] bg-[oklch(1_0_0/0.6)] py-[7px] px-3.5 rounded-[8px] text-center">
          {placeholder}
        </span>
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
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square rounded-[28px] overflow-hidden">
        {tagBadge}
        <GalleryTile
          item={items[activeIndex]}
          layoutId={`product-gallery-${activeIndex}`}
          onClick={() => setOpenIndex(activeIndex)}
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-2.5 flex-wrap">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Show photo ${i + 1}`}
              className={cn(
                "relative w-16 h-16 rounded-[10px] overflow-hidden border-[1.5px] shrink-0 cursor-pointer",
                i === activeIndex ? "border-primary" : "border-transparent"
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
