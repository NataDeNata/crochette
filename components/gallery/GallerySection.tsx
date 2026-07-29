"use client";

import { useState, type CSSProperties } from "react";
import { AnimatePresence } from "framer-motion";
import { FadeIn } from "@/components/motion/FadeIn";
import { GalleryTile } from "@/components/ui/GalleryTile";
import { Lightbox } from "@/components/motion/Lightbox";
import type { GalleryItem } from "@/lib/data/gallery";

export function GallerySection({ items, rowHeight }: { items: GalleryItem[]; rowHeight: number }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <div
        className="gallery-grid grid auto-rows-[var(--row-h)] gap-5"
        style={{ "--row-h": `${rowHeight}px` } as CSSProperties}
      >
        {items.map((g, i) => (
          <FadeIn key={i} delay={(i % 4) * 0.05} className={g.span === 2 ? "row-span-2" : "row-span-1"}>
            <GalleryTile item={g} layoutId={`gallery-${i}`} onClick={() => setOpenIndex(i)} />
          </FadeIn>
        ))}
      </div>
      <AnimatePresence>
        {openIndex !== null && (
          <Lightbox
            item={items[openIndex]}
            layoutId={`gallery-${openIndex}`}
            onClose={() => setOpenIndex(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
