"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/CartContext";
import { cn } from "@/lib/utils";

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
    <div className="flex items-center gap-3.5 flex-wrap">
      <div
        className={cn(
          "flex items-center border-[1.5px] border-[oklch(0.85_0.02_60)] rounded-[30px] overflow-hidden",
          outOfStock ? "opacity-50" : "opacity-100",
        )}
      >
        <button
          type="button"
          disabled={outOfStock}
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          aria-label="Decrease quantity"
          className={cn("py-3 px-4 bg-transparent border-0 text-[15px]", outOfStock ? "cursor-not-allowed" : "cursor-pointer")}
        >
          −
        </button>
        <span className="text-sm min-w-4.5 text-center">{quantity}</span>
        <button
          type="button"
          disabled={outOfStock}
          onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
          aria-label="Increase quantity"
          className={cn("py-3 px-4 bg-transparent border-0 text-[15px]", outOfStock ? "cursor-not-allowed" : "cursor-pointer")}
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
            className="inline-block"
          >
            {outOfStock ? "Out of stock" : added ? "Added to cart ✓" : "Add to cart"}
          </motion.span>
        </AnimatePresence>
      </Button>
    </div>
  );
}
