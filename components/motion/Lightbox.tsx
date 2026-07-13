"use client";

import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
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

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      style={{
        position: "absolute",
        top: -44,
        right: 0,
        background: "none",
        border: "none",
        color: "oklch(0.98 0.01 85)",
        fontSize: 28,
        lineHeight: 1,
        cursor: "pointer",
      }}
    >
      ×
    </button>
  );

  const panelContent = (
    <span
      style={{
        fontFamily: "ui-monospace, monospace",
        fontSize: 14,
        color: "oklch(0.35 0.03 60)",
        background: "oklch(1 0 0 / 0.7)",
        padding: "8px 16px",
        borderRadius: 8,
        textAlign: "center",
      }}
    >
      {item.placeholder}
    </span>
  );

  const overlayBaseStyle = {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;

  const panelBaseStyle = {
    position: "relative",
    width: "min(640px,90vw)",
    aspectRatio: "4/3",
    borderRadius: 24,
    overflow: "hidden",
    background: item.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;

  if (reduceMotion) {
    return createPortal(
      <div style={{ ...overlayBaseStyle, background: "oklch(0.2 0.02 60 / 0.7)" }} onClick={onClose}>
        <div style={panelBaseStyle} onClick={(e) => e.stopPropagation()}>
          {closeButton}
          {panelContent}
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div style={overlayBaseStyle}>
      <motion.div
        style={{ ...overlayBaseStyle, background: "oklch(0.2 0.02 60 / 0.7)" }}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      <motion.div layoutId={layoutId} style={{ ...panelBaseStyle, zIndex: 1 }} onClick={(e) => e.stopPropagation()}>
        {closeButton}
        {panelContent}
      </motion.div>
    </div>,
    document.body,
  );
}
