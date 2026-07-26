"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Product } from "@/lib/data/products";
import { formatPrice } from "@/lib/data/products";
import { useCart } from "@/lib/cart/CartContext";

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
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const outOfStock = product.stockQty <= 0;

  function handleQuickAdd(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  const quickAddButton = (
    <button
      type="button"
      onClick={handleQuickAdd}
      disabled={outOfStock}
      aria-label={outOfStock ? `${product.name} is out of stock` : `Add ${product.name} to cart`}
      className="quick-add-btn"
      style={{
        position: "absolute",
        bottom: 12,
        right: 12,
        zIndex: 2,
        width: 38,
        height: 38,
        borderRadius: "50%",
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: outOfStock ? "not-allowed" : "pointer",
        opacity: outOfStock ? 0.5 : 1,
        boxShadow: "0 4px 10px -4px oklch(0.28 0.02 60 / 0.35)",
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {added ? (
          <motion.svg
            key="check"
            initial={reduceMotion ? undefined : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.15 }}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </motion.svg>
        ) : (
          <motion.svg
            key="cart"
            initial={reduceMotion ? undefined : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.15 }}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </motion.svg>
        )}
      </AnimatePresence>
    </button>
  );

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
          {quickAddButton}
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
          {quickAddButton}
        </motion.div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>{product.name}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "oklch(0.5 0.09 20)" }}>
          {formatPrice(product.priceCents)}
        </span>
      </div>
    </Link>
  );
}
