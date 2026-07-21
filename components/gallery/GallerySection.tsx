"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { FadeIn } from "@/components/motion/FadeIn";
import { GalleryTile } from "@/components/ui/GalleryTile";
import { Lightbox } from "@/components/motion/Lightbox";
import type { GalleryItem } from "@/lib/data/gallery";

export function GallerySection({ items, rowHeight }: { items: GalleryItem[]; rowHeight: number }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <div className="gallery-grid" style={{ display: "grid", gridAutoRows: rowHeight, gap: 20 }}>
        {items.map((g, i) => (
          <FadeIn key={i} delay={(i % 4) * 0.05} style={{ gridRow: `span ${g.span}` }}>
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
