"use client";

import { motion, useReducedMotion } from "framer-motion";
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

  const content = (
    <span
      style={{
        fontFamily: "ui-monospace, monospace",
        fontSize: 11,
        color: "oklch(0.35 0.03 60)",
        background: "oklch(1 0 0 / 0.6)",
        padding: "5px 10px",
        borderRadius: 6,
        textAlign: "center",
      }}
    >
      {item.placeholder}
    </span>
  );

  const baseStyle = {
    height: "100%",
    borderRadius: 18,
    overflow: "hidden",
    background: item.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;

  if (reduceMotion) {
    return (
      <div style={{ ...baseStyle, cursor: onClick ? "pointer" : undefined }} onClick={onClick}>
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
      style={{ ...baseStyle, cursor: onClick ? "pointer" : undefined }}
    >
      {content}
    </motion.div>
  );
}
