"use client";

import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCart } from "@/lib/cart/CartContext";
import { SHIPPING_CENTS } from "@/lib/cart/constants";
import { formatPrice } from "@/lib/data/products";

export default function CartPage() {
  const { items, removeItem, setQuantity, subtotalCents, loaded } = useCart();
  const reduceMotion = useReducedMotion();

  // Gated on `loaded`, not just on `items.length`. The cart is server-owned and
  // the store starts empty, so an ungated check renders "Your cart is empty"
  // during SSR and for the first client frame — on every visit, including one
  // with a full cart. That flash is the same class of bug as the ₱0 checkout
  // summary (see CheckoutFormSkeleton); the fix is the same, show a placeholder
  // until there is something true to say.
  if (!loaded) {
    return (
      <section className="pt-12 page-gutter pb-24 max-w-[800px] mx-auto" aria-hidden>
        <Skeleton className="h-[34px] w-44 mb-7" />
        <div className="flex flex-col gap-1">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-4 gap-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-[17px] w-40 rounded-full" />
                <Skeleton className="h-3.5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-[42px] w-[104px] rounded-[30px]" />
            </div>
          ))}
        </div>
        <div className="mt-7 flex flex-col gap-2">
          <Skeleton className="h-4 w-full max-w-[220px] rounded-full" />
          <Skeleton className="h-4 w-full max-w-[180px] rounded-full" />
          <Skeleton className="h-[18px] w-full max-w-[200px] rounded-full mt-1.5" />
        </div>
        <Skeleton className="h-12 w-full rounded-[30px] mt-7" />
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="py-20 page-gutter text-center">
        <h1 className="font-serif font-medium text-[32px] mb-3">Your cart is empty</h1>
        <p className="text-[14.5px] text-muted-foreground mb-7">
          Take a look around the shop — something handmade is waiting.
        </p>
        <Button href="/shop">Browse the shop</Button>
      </section>
    );
  }

  const total = subtotalCents + SHIPPING_CENTS;

  return (
    <section className="pt-12 page-gutter pb-24 max-w-[800px] mx-auto">
      <h1 className="font-serif font-medium text-[34px] mb-7">Your cart</h1>

      <div className="flex flex-col gap-1">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.productId}
              layout={!reduceMotion}
              initial={reduceMotion ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              // Two tiers below `sm`: the name/price block on its own row, the
              // controls on a second full-width row. The five controls used to
              // share one unwrapped line, which overflowed a 320px screen by
              // well over 100px. `flex-wrap` alone wouldn't do it — the
              // controls are a nested flex row, so that row is what has to go
              // full-width and redistribute.
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 py-[18px] px-1 border-b border-[oklch(0.92_0.015_60)]"
            >
              <div className="min-w-0">
                <Link href={`/shop/${item.slug}`} className="text-[15px] font-medium text-inherit">
                  {item.name}
                </Link>
                <div className="text-[13px] text-muted-foreground mt-0.75">
                  {formatPrice(item.priceCents)} each
                </div>
                {/* Sits with the item rather than in the controls row: it is a
                    status about the line, not a control, and in the controls
                    row it was the one element that pushed a 320px screen back
                    into overflow after the two-tier reflow. */}
                {item.quantity >= item.stockQty && (
                  <div className="text-xs text-[oklch(0.55_0.15_40)] mt-1">Max in stock</div>
                )}
              </div>

              <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-[18px]">
                <div className="flex items-center border-[1.5px] border-[oklch(0.9_0.02_60)] rounded-[24px] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity(item.productId, item.quantity - 1)}
                    aria-label={`Decrease quantity of ${item.name}`}
                    className="py-3 px-4 sm:py-2 sm:px-3 bg-transparent border-0 cursor-pointer"
                  >
                    −
                  </button>
                  <span className="text-[13.5px] min-w-4 text-center">{item.quantity}</span>
                  <button
                    type="button"
                    disabled={item.quantity >= Math.min(20, item.stockQty)}
                    onClick={() => setQuantity(item.productId, Math.min(20, item.stockQty, item.quantity + 1))}
                    aria-label={`Increase quantity of ${item.name}`}
                    className={`py-3 px-4 sm:py-2 sm:px-3 bg-transparent border-0 ${
                      item.quantity >= Math.min(20, item.stockQty)
                        ? "cursor-not-allowed opacity-40"
                        : "cursor-pointer opacity-100"
                    }`}
                  >
                    +
                  </button>
                </div>
                <div className="text-[14.5px] min-w-[70px] text-right">
                  {formatPrice(item.priceCents * item.quantity)}
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  aria-label={`Remove ${item.name} from cart`}
                  className="bg-transparent border-0 cursor-pointer text-[oklch(0.55_0.02_60)] text-[13px]"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-7 flex flex-col gap-2 text-[14.5px]">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatPrice(subtotalCents)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Shipping</span>
          <span>{formatPrice(SHIPPING_CENTS)}</span>
        </div>
        <div className="flex justify-between text-lg font-medium mt-1.5">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      {/* `prefetch` is explicit because /checkout is a dynamic route: it awaits
          auth() and then listAddresses(), so Next's default treatment leaves
          the work to click time. Anyone looking at a filled cart is very likely
          to go there next, and warming it now turns the slowest hop in the
          purchase flow into a mostly-resolved one. */}
      <Button href="/checkout" prefetch className="block w-full text-center mt-7 text-[15px]">
        Proceed to checkout
      </Button>
    </section>
  );
}
