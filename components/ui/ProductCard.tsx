"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Product } from "@/lib/data/products";
import { formatPrice } from "@/lib/data/products";
import { useCart } from "@/lib/cart/CartContext";
import { cn } from "@/lib/utils";

const imageWrapClassName = "aspect-square rounded-[20px] overflow-hidden flex items-center justify-center relative";

export function ProductCard({ product, onDark = false }: { product: Product; onDark?: boolean }) {
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
      className={cn(
        "absolute bottom-3 right-3 z-[2] w-[38px] h-[38px] rounded-full border-0 flex items-center justify-center",
        "shadow-[0_4px_10px_-4px_oklch(0.28_0.02_60/0.35)] bg-[oklch(0.98_0.01_85/0.92)] text-[oklch(0.28_0.02_60)]",
        "transition-colors duration-200 enabled:hover:bg-primary enabled:hover:text-card enabled:focus-visible:bg-primary enabled:focus-visible:text-card",
        outOfStock ? "cursor-not-allowed opacity-50" : "cursor-pointer opacity-100",
      )}
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
    <div className="absolute top-3.5 left-3.5 bg-[oklch(0.98_0.01_85/0.9)] py-[5px] px-3 rounded-[14px] text-[11px] font-semibold tracking-[0.5px] uppercase text-[oklch(0.5_0.09_20)]">
      {product.tag}
    </div>
  );

  const placeholder = (
    <span className="[font-family:ui-monospace,monospace] text-xs text-[oklch(0.35_0.03_60)] bg-[oklch(1_0_0/0.6)] px-3 py-1.5 rounded-[6px] text-center">
      {product.placeholder}
    </span>
  );

  return (
    <Link href={`/shop/${product.slug}`} className="flex flex-col gap-3.5">
      {reduceMotion ? (
        <div className={cn(imageWrapClassName, product.bgClassName)}>
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
          className={cn(imageWrapClassName, product.bgClassName)}
        >
          {tag}
          <span className="product-card-placeholder-caption absolute bottom-3 left-3">
            {product.placeholder}
          </span>
          {quickAddButton}
        </motion.div>
      )}
      <div className="flex justify-between items-baseline">
        <span className={cn("text-[17px] font-medium", onDark && "text-[oklch(0.98_0.01_85)]")}>
          {product.name}
        </span>
        <span
          className={cn(
            "text-[17px] font-bold",
            onDark ? "text-[oklch(0.88_0.07_20)]" : "text-[oklch(0.5_0.09_20)]",
          )}
        >
          {formatPrice(product.priceCents)}
        </span>
      </div>
    </Link>
  );
}
