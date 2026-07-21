"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/lib/cart/CartContext";

export function AddToCartButton({
  product,
}: {
  product: { id: string; slug: string; name: string; priceCents: number; stockQty: number };
}) {
  const { addItem } = useCart();
  const reduceMotion = useReducedMotion();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const outOfStock = product.stockQty <= 0;
  const maxQuantity = Math.min(20, product.stockQty);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          border: "1.5px solid oklch(0.85 0.02 60)",
          borderRadius: 30,
          overflow: "hidden",
          opacity: outOfStock ? 0.5 : 1,
        }}
      >
        <button
          type="button"
          disabled={outOfStock}
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          aria-label="Decrease quantity"
          style={{ padding: "12px 16px", background: "none", border: "none", cursor: outOfStock ? "not-allowed" : "pointer", fontSize: 15 }}
        >
          −
        </button>
        <span style={{ fontSize: 14, minWidth: 18, textAlign: "center" }}>{quantity}</span>
        <button
          type="button"
          disabled={outOfStock}
          onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
          aria-label="Increase quantity"
          style={{ padding: "12px 16px", background: "none", border: "none", cursor: outOfStock ? "not-allowed" : "pointer", fontSize: 15 }}
        >
          +
        </button>
      </div>

      <Button
        type="button"
        disabled={outOfStock}
        onClick={() => {
          if (outOfStock) return;
          addItem(product, Math.min(quantity, maxQuantity));
          setQuantity(1);
          setAdded(true);
          setTimeout(() => setAdded(false), 1600);
        }}
        className="min-w-[148px] disabled:bg-[oklch(0.85_0.01_60)] disabled:text-[oklch(0.4_0.02_60)] disabled:opacity-100"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={outOfStock ? "out" : added ? "added" : "add"}
            initial={reduceMotion ? undefined : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            style={{ display: "inline-block" }}
          >
            {outOfStock ? "Out of stock" : added ? "Added to cart ✓" : "Add to cart"}
          </motion.span>
        </AnimatePresence>
      </Button>
    </div>
  );
}
