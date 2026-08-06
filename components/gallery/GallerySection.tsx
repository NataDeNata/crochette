"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { FadeIn } from "@/components/motion/FadeIn";
import { GalleryTile } from "@/components/ui/GalleryTile";
import { Lightbox } from "@/components/motion/Lightbox";
import type { GalleryItem } from "@/lib/data/gallery";

/** Base (4-up) row height. A closed set of two, not free-form runtime data —
 * 150 is the home teaser, 180 is /gallery. Both classes must stay written out
 * as literals so Tailwind's content scanner can see them at build time; below
 * 760px `.gallery-grid` in globals.css takes the row height over entirely. */
const ROW_HEIGHT_CLASS = {
  150: "auto-rows-[150px]",
  180: "auto-rows-[180px]",
} as const;

export function GallerySection({
  items,
  rowHeight,
}: {
  items: GalleryItem[];
  rowHeight: keyof typeof ROW_HEIGHT_CLASS;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <div className={`gallery-grid grid gap-4 sm:gap-5 ${ROW_HEIGHT_CLASS[rowHeight]}`}>
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
