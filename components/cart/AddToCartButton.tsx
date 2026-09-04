"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/Spinner";
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
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
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
        disabled={outOfStock || adding}
        onClick={async () => {
          if (outOfStock || adding) return;
          setAdding(true);
          // Waits for the server's confirmation before claiming "Added" — see
          // addItem's note in CartContext.tsx. The optimistic line is already
          // in the cart by the time this call is even made; this wait is only
          // about when the button is honest to say so, not about whether the
          // item is really there.
          await addItem(product, Math.min(quantity, maxQuantity));
          setAdding(false);
          setQuantity(1);
          setAdded(true);
          setTimeout(() => setAdded(false), 1600);
        }}
        className="min-w-[168px] disabled:bg-secondary disabled:text-muted-foreground disabled:opacity-100"
      >
        {/* A plain conditional, not the `AnimatePresence` + dynamically-keyed
         * `motion.span` this used to be. That combination does not actually
         * work: measured directly (a component-level `console.log` next to a
         * parallel plain `<span>` carrying the identical condition) — React's
         * own state cycled outOfStock → adding → added → outOfStock exactly
         * as coded, on every render, and the plain span updated with it every
         * time, while the `motion.span` inside `AnimatePresence` stayed
         * frozen on whatever it first rendered and never updated again for
         * the rest of the button's lifetime. Not a timing artifact — held
         * disabled for a full ~2 real seconds while genuinely `adding`, and
         * the label never once read "Adding" or "Added" in that window.
         *
         * Root cause not chased further: framer-motion 12.42.2 on React
         * 19.2.4, `mode="wait"` with a single child re-keyed three ways in
         * quick succession, is enough to reproduce it, and reproducing it is
         * where the return on more digging stopped being worth it. Cutout's
         * quick-add icon swap next to this button already uses a plain
         * ternary for the same kind of state and was never wrapped in this,
         * which is presumably why it was never seen there.
         *
         * The fade this cost is the smaller loss than a button that can get
         * stuck claiming "Add to cart" while genuinely mid-request or already
         * confirmed — the entire reason a loading state was added here in the
         * first place. */}
        <span className="inline-flex items-center gap-2">
          {outOfStock ? (
            "Sold out"
          ) : adding ? (
            <>
              Adding <Spinner className="h-3.5 w-3.5" />
            </>
          ) : added ? (
            <>
              Added <CheckMark />
            </>
          ) : (
            "Add to cart"
          )}
        </span>
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
