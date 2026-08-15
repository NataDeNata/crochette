"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/CartContext";
import { cn } from "@/lib/utils";

/* Quantity and the commit, side by side.
 *
 * Rebuilt off three cream-palette oklch literals, a 30px pill and a Unicode
 * check mark standing in for an icon. The stepper is a keyline box with drawn
 * marks in the sheet's own 2px stroke; the commit is the Button primitive,
 * which the world restates as a square tab in globals.css.
 */
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
  const atLimit = quantity >= maxQuantity;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        className={cn(
          "flex items-stretch border-2 border-keyline",
          outOfStock && "opacity-50",
        )}
      >
        <button
          type="button"
          disabled={outOfStock}
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          aria-label="Decrease quantity"
          className={cn(
            "flex h-11 w-11 items-center justify-center border-0 bg-transparent text-keyline",
            "transition-colors duration-200 enabled:hover:bg-butter",
            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-press-red",
            outOfStock ? "cursor-not-allowed" : "cursor-pointer",
          )}
        >
          <MinusMark />
        </button>
        <span
          aria-live="polite"
          className="type-sheet-spec flex min-w-9 items-center justify-center border-x-2 border-keyline px-1 tabular-nums text-keyline"
        >
          {quantity}
        </span>
        <button
          type="button"
          disabled={outOfStock || atLimit}
          onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
          aria-label="Increase quantity"
          className={cn(
            "flex h-11 w-11 items-center justify-center border-0 bg-transparent text-keyline",
            "transition-colors duration-200 enabled:hover:bg-butter",
            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-press-red",
            outOfStock || atLimit ? "cursor-not-allowed" : "cursor-pointer",
          )}
        >
          <PlusMark />
        </button>
      </div>

      {/* The stepper used to just stop. Clamping silently at the stock limit
          reads as a broken control — a shopper pressing + on a piece with five
          left has no way to tell "there are only five" from "this button
          doesn't work". `aria-live` because the message appears in response to
          a press that produced no other change. */}
      {atLimit && !outOfStock && (
        <p aria-live="polite" className="type-sheet-spec basis-full text-keyline/60">
          {maxQuantity === product.stockQty
            ? `That's all we have — ${product.stockQty} left`
            : `${maxQuantity} per order`}
        </p>
      )}

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
        className="min-w-[168px] disabled:bg-secondary disabled:text-muted-foreground disabled:opacity-100"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={outOfStock ? "out" : added ? "added" : "add"}
            initial={reduceMotion ? undefined : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className="inline-flex items-center gap-2"
          >
            {outOfStock ? (
              "Sold out"
            ) : added ? (
              <>
                Added <CheckMark />
              </>
            ) : (
              "Add to cart"
            )}
          </motion.span>
        </AnimatePresence>
      </Button>
    </div>
  );
}

function MinusMark() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}

function PlusMark() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}

function CheckMark() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M1.5 7.5 5.4 11.5 12.5 2.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />
    </svg>
  );
}
