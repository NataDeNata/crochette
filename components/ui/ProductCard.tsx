"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, type MouseEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Product } from "@/lib/data/products";
import { formatPrice } from "@/lib/data/products";
import { useCart } from "@/lib/cart/CartContext";
import { cn } from "@/lib/utils";

/* A product sits on paper: a soft-edged panel with a bamboo hairline, matching
 * the card component on the quality-bar board. */
const imageWrapClassName =
  "aspect-square overflow-hidden flex items-center justify-center relative rounded-lg border border-border";

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
      className={cn(
        // Inset from the corner and filled with near-opaque washi, so it reads
        // as a small paper tab laid on the photograph rather than a floating pill.
        "absolute bottom-2.5 right-2.5 z-[2] w-11 h-11 rounded-lg border border-border flex items-center justify-center",
        "bg-washi/95 text-ink",
        "transition-colors duration-200 enabled:hover:bg-bamboo enabled:focus-visible:bg-bamboo",
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
    // The same paper tab, top-left, in the world's small-caps label face.
    <div className="absolute top-2.5 left-2.5 bg-washi/95 py-1 px-2.5 rounded-lg type-akari-label text-ink">
      {product.tag}
    </div>
  );

  const placeholder = (
    <span className="product-card-placeholder-caption text-center">
      {product.placeholder}
    </span>
  );

  const image = product.primaryImageUrl && (
    <Image
      src={product.primaryImageUrl}
      alt={product.images.find((img) => img.isPrimary)?.alt || product.name}
      fill
      sizes="(max-width: 768px) 50vw, 25vw"
      className="object-cover"
    />
  );

  return (
    <Link href={`/shop/${product.slug}`} className="flex flex-col gap-3.5">
      {reduceMotion ? (
        <div className={cn(imageWrapClassName, product.bgClassName)}>
          {image}
          {tag}
          {!image && placeholder}
          {quickAddButton}
        </div>
      ) : (
        <motion.div
          initial="rest"
          whileHover="hover"
          whileTap={{ scale: 0.98 }}
          // The panel lifts rather than grows. The shadow carries a real offset
          // and blur and is mixed from the ground's own ink, never a grey.
          variants={{
            rest: { y: 0, boxShadow: "0 0px 0px 0px oklch(0.215 0.003 90 / 0)" },
            hover: { y: -4, boxShadow: "0 12px 24px -12px oklch(0.215 0.003 90 / 0.28)" },
          }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className={cn(imageWrapClassName, product.bgClassName)}
        >
          {image}
          {tag}
          {!image && (
            <span className="product-card-placeholder-caption absolute bottom-3 left-3">
              {product.placeholder}
            </span>
          )}
          {quickAddButton}
        </motion.div>
      )}
      {/* Name left, price right and tabular so a column of cards keeps its
          figures aligned.

          The `onDark` prop this component used to take is gone. It existed to
          switch the caption between two palettes because the old design put
          product cards on both a cream page and a dark photographic band; the
          storefront is now one ground, so the branch had exactly one live
          answer and was deleted rather than left as a parameter that could only
          be passed one way. */}
      <div className="flex justify-between items-baseline gap-3">
        <span className="text-[15px] text-ink truncate">{product.name}</span>
        <span className="text-[15px] text-muted-foreground shrink-0 tabular-nums">
          {formatPrice(product.priceCents)}
        </span>
      </div>
    </Link>
  );
}
