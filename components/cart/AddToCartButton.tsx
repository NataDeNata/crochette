"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCart } from "@/lib/cart/CartContext";

export function AddToCartButton({
  product,
}: {
  product: { id: string; slug: string; name: string; priceCents: number };
}) {
  const { addItem } = useCart();
  const reduceMotion = useReducedMotion();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          border: "1.5px solid oklch(0.85 0.02 60)",
          borderRadius: 30,
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          aria-label="Decrease quantity"
          style={{ padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 15 }}
        >
          −
        </button>
        <span style={{ fontSize: 14, minWidth: 18, textAlign: "center" }}>{quantity}</span>
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.min(20, q + 1))}
          aria-label="Increase quantity"
          style={{ padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 15 }}
        >
          +
        </button>
      </div>

      <motion.button
        type="button"
        whileTap={reduceMotion ? undefined : { scale: 0.97 }}
        onClick={() => {
          addItem(product, quantity);
          setQuantity(1);
          setAdded(true);
          setTimeout(() => setAdded(false), 1600);
        }}
        style={{
          background: "oklch(0.28 0.02 60)",
          color: "oklch(0.98 0.01 85)",
          padding: "14px 30px",
          borderRadius: 30,
          fontSize: 14,
          fontWeight: 500,
          border: "none",
          cursor: "pointer",
          minWidth: 148,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={added ? "added" : "add"}
            initial={reduceMotion ? undefined : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            style={{ display: "inline-block" }}
          >
            {added ? "Added to cart ✓" : "Add to cart"}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
