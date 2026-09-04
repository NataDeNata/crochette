"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, type MouseEvent } from "react";
import type { Product } from "@/lib/data/products";
import { formatPrice, LOW_STOCK_THRESHOLD } from "@/lib/data/products";
import { useCart } from "@/lib/cart/CartContext";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

/* A figure on the sheet — the one construction every product surface in this
 * world renders, from the landing sheet to the catalogue to the hero.
 *
 * Four layers, outside in: the dashed cut line, the white trim margin the
 * scissors are meant to leave, the die-cut window, and the photograph. All
 * three edges share `.diecut-arch`, so the curve is one declaration rather
 * than three numbers kept in step by hand.
 *
 * The tab is the load-bearing part of the paper-doll grammar — it is what says
 * the thing is meant to come off the page — so it carries the piece's name,
 * price and stock rather than being drawn as ornament and labelled elsewhere.
 *
 * THE SOLD-OUT STATE. A press sheet already knows how to say "this one is
 * gone": the figure has been pressed out, cut line and tab stub intact. This
 * used to be drawn as a literal hole — no photograph at all, the ground colour
 * showing through the window.
 *
 * That was wrong twice over, and it took someone loading the page and asking
 * why the products had no pictures to see it.
 *
 * It was wrong commercially: a shopper who cannot see the sold-out piece cannot
 * decide they want one like it, and a commission is exactly what this studio
 * wants them to want (see PRODUCT.md — /custom is the positioning). Suppressing
 * the photograph also contradicts this world's own stated rule, that a
 * photograph is evidence of a piece rather than atmosphere; the evidence is
 * most load-bearing precisely when the piece is no longer on the shelf.
 *
 * And it was wrong perceptually the moment the world was repainted cream: a
 * flat mid-taupe rectangle inside a window is indistinguishable from an image
 * skeleton, so the deliberate state read as a broken one. It survived review
 * while the fill was viridian only because no other element on the page was
 * that colour — the state was legible by accident of palette, not by design.
 *
 * So the photograph now stays, dimmed and desaturated under a scrim, and the
 * word is overprinted on an opaque plate. The metaphor gives up being literal
 * and keeps being readable: the figure is still tabbed "Pressed out", still
 * ringed by its cut line, and still visibly not available.
 */
export function Cutout({
  product,
  scale = "figure",
  priority = false,
  quickAdd = true,
}: {
  product: Product;
  scale?: "lead" | "figure";
  priority?: boolean;
  quickAdd?: boolean;
}) {
  const { addItem } = useCart();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const soldOut = product.stockQty <= 0;

  /* `LOW_STOCK_THRESHOLD` (5), not `products.low_stock_threshold`. The two are
   * deliberately different numbers with a unit test holding them apart: this
   * one is a customer-facing urgency signal, the other is the studio owner's
   * per-product restock alert. Reaching for the admin's number here would put
   * an operational trigger in front of a shopper. */
  const lowStock = !soldOut && product.stockQty <= LOW_STOCK_THRESHOLD;
  const lead = scale === "lead";

  const alt = product.images.find((img) => img.isPrimary)?.alt || product.name;

  async function handleQuickAdd(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut || adding) return;
    setAdding(true);
    // See AddToCartButton's identical wait: the checkmark should mean the
    // server has confirmed, not just that the tap registered.
    await addItem(product, 1);
    setAdding(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="cutout-slot group block focus:outline-none"
    >
      <div className="cutout-figure">
        {/* The fold tab. The dashed rule across its base is the fold, which is
            why it sits at the bottom edge rather than through the middle. */}
        <div
          className={cn(
            "relative z-[1] mx-auto w-fit max-w-full border-2 border-keyline border-b-0 px-3 pb-2 pt-1.5 text-center",
            soldOut ? "bg-secondary" : "bg-butter",
          )}
        >
          <p
            className={cn(
              "type-sheet-display text-keyline truncate",
              lead ? "text-[19px] sm:text-[22px]" : "text-[15px] sm:text-[17px]",
            )}
          >
            {product.name}
          </p>
          <p
            className={cn(
              "type-sheet-spec tabular-nums",
              lead ? "text-[11px]" : "text-[10px]",
              soldOut ? "text-keyline/60" : "text-keyline/75",
            )}
          >
            {soldOut ? "Sold out" : formatPrice(product.priceCents)}
            {lowStock && ` · Last ${product.stockQty}`}
          </p>
          <span className="pointer-events-none absolute inset-x-2 bottom-0 border-b border-dashed border-keyline/50" />
        </div>

        <div className="relative">
          {/* Cut line → trim margin → window. */}
          <div className="diecut-arch border-2 border-dashed border-keyline p-1.5">
            <div className="diecut-arch border-2 border-keyline bg-sheet p-1.5">
              <div
                className={cn(
                  "diecut-arch relative overflow-hidden aspect-4/5",
                  // Only ever seen behind a piece with no photograph uploaded.
                  // --ground-deep is the mid taupe kept for that case; the
                  // scrim below is what dims a photograph that does exist.
                  soldOut ? "bg-ground-deep" : "bg-secondary",
                )}
              >
                {product.primaryImageUrl ? (
                  <Image
                    src={product.primaryImageUrl}
                    alt={alt}
                    fill
                    priority={priority}
                    sizes={
                      lead
                        ? "(max-width: 1024px) 92vw, 40vw"
                        : "(max-width: 640px) 44vw, 28vw"
                    }
                    // Desaturated rather than only faded. Fading alone leaves a
                    // full-colour piece competing for attention with the ones
                    // that can actually be bought; draining the colour is what
                    // says "this is a record of a piece, not an offer".
                    className={cn("object-cover", soldOut && "grayscale-[0.7] opacity-60")}
                  />
                ) : null}

                {soldOut && (
                  <>
                    {/* The scrim sits above the photograph and below the word.
                        It is the ground colour, so a pressed-out figure still
                        reads as belonging to the hole it left, and it makes the
                        dimming consistent across photographs that were shot at
                        wildly different exposures. */}
                    <span
                      aria-hidden
                      className="absolute inset-0 bg-ground-deep/45"
                    />
                    {/* An opaque plate, not text laid straight on the image.
                        The word has to survive being printed over an arbitrary
                        photograph, and no ink is legible on every possible one
                        — so the plate guarantees the pairing instead: keyline
                        on sheet, 14.13:1, whatever is underneath. */}
                    <span className="absolute inset-x-0 bottom-6 flex justify-center">
                      <span className="type-sheet-spec bg-sheet text-keyline px-3 py-1">
                        Out of stock
                      </span>
                    </span>
                  </>
                )}

                {!soldOut && !product.primaryImageUrl && (
                  <span className="absolute inset-0 flex items-end justify-center p-4 text-center text-[12px] text-muted-foreground">
                    {product.placeholder}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick-add rides the base of the arch as its own small tab, so the
              one control on a figure is built the same way the figure is. It
              is deliberately not a floating circle over the photograph: this
              world has no pills, and a piece is judged on the photograph. */}
          {quickAdd && !soldOut && (
            <button
              type="button"
              disabled={adding}
              onClick={handleQuickAdd}
              aria-label={`Add ${product.name} to cart`}
              className="absolute left-1/2 -bottom-px z-[2] flex h-11 w-11 -translate-x-1/2 items-center justify-center border-2 border-keyline bg-sheet text-keyline transition-colors duration-200 enabled:cursor-pointer enabled:hover:bg-butter focus-visible:bg-butter focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red disabled:cursor-not-allowed"
            >
              {adding ? <Spinner className="h-3.5 w-3.5" /> : added ? <CheckMark /> : <PlusMark />}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

/* Drawn, at the keyline's own 2px weight, so the marks on a figure and the
 * rules on the sheet are the same stroke. */
function PlusMark() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 1.5v13M1.5 8h13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />
    </svg>
  );
}

function CheckMark() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 8.5 6.2 13 14 3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />
    </svg>
  );
}
