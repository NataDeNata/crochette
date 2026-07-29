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

  if (reduceMotion) {
    return (
      <div className={cn(baseClassName, onClick && "cursor-pointer")} onClick={onClick}>
        {content}
      </div>
    );
  }

  return (
    <motion.div
      layoutId={layoutId}
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn(baseClassName, onClick && "cursor-pointer")}
    >
      {content}
    </motion.div>
  );
}
