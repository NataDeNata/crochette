"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { Product } from "@/lib/data/products";
import { formatPrice } from "@/lib/data/products";

const imageWrapStyle = {
  aspectRatio: "1",
  borderRadius: 20,
  overflow: "hidden",
  background: undefined as string | undefined,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
} as const;

export function ProductCard({ product }: { product: Product }) {
  const reduceMotion = useReducedMotion();

  const tag = product.tag && (
    <div
      style={{
        position: "absolute",
        top: 14,
        left: 14,
        background: "oklch(0.98 0.01 85 / 0.9)",
        padding: "5px 12px",
        borderRadius: 14,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        color: "oklch(0.5 0.09 20)",
      }}
    >
      {product.tag}
    </div>
  );

  const placeholder = (
    <span
      style={{
        fontFamily: "ui-monospace, monospace",
        fontSize: 12,
        color: "oklch(0.35 0.03 60)",
        background: "oklch(1 0 0 / 0.6)",
        padding: "6px 12px",
        borderRadius: 6,
        textAlign: "center",
      }}
    >
      {product.placeholder}
    </span>
  );

  return (
    <Link
      href={`/shop/${product.slug}`}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      {reduceMotion ? (
        <div style={{ ...imageWrapStyle, background: product.bg }}>
          {tag}
          {placeholder}
        </div>
      ) : (
        <motion.div
          initial="rest"
          whileHover="hover"
          whileTap={{ scale: 0.98 }}
          variants={{
            rest: { y: 0, scale: 1, boxShadow: "0 0px 0px 0px oklch(0.28 0.02 60 / 0)" },
            hover: { y: -6, scale: 1.015, boxShadow: "0 18px 30px -12px oklch(0.28 0.02 60 / 0.25)" },
          }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          style={{ ...imageWrapStyle, background: product.bg }}
        >
          {tag}
          <motion.div
            variants={{ rest: { scale: 1 }, hover: { scale: 1.06 } }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {placeholder}
          </motion.div>
        </motion.div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>{product.name}</span>
        <span style={{ fontSize: 14, color: "oklch(0.5 0.05 20)" }}>
          {formatPrice(product.priceCents)}
        </span>
      </div>
    </Link>
  );
}
