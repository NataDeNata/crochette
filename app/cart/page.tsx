"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCart } from "@/lib/cart/CartContext";
import { SHIPPING_CENTS } from "@/lib/cart/constants";
import { formatPrice } from "@/lib/data/products";

export default function CartPage() {
  const { items, removeItem, setQuantity, subtotalCents, loaded } = useCart();

  // Gated on `loaded`, not just on `items.length`. The cart is server-owned and
  // the store starts empty, so an ungated check renders "Your cart is empty"
  // during SSR and for the first client frame — on every visit, including one
  // with a full cart. That flash is the same class of bug as the ₱0 checkout
  // summary (see CheckoutFormSkeleton); the fix is the same, show a placeholder
  // until there is something true to say.
  if (!loaded) {
    return (
      <Envelope aria-hidden>
        <Skeleton className="h-[34px] w-44 mb-7 rounded-none" />
        <div className="flex flex-col gap-1">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-4 gap-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-[17px] w-40 rounded-none" />
                <Skeleton className="h-3.5 w-20 rounded-none" />
              </div>
              <Skeleton className="h-[44px] w-[132px] rounded-none" />
            </div>
          ))}
        </div>
        <div className="mt-7 flex flex-col gap-2">
          <Skeleton className="h-4 w-full max-w-[220px] rounded-none" />
          <Skeleton className="h-4 w-full max-w-[180px] rounded-none" />
          <Skeleton className="h-[18px] w-full max-w-[200px] rounded-none mt-1.5" />
        </div>
        <Skeleton className="h-12 w-full rounded-none mt-7" />
      </Envelope>
    );
  }

  if (items.length === 0) {
    return (
      <Envelope>
        {/* The empty cut line is drawn, and it still carries the world. The
            *words* do not: an empty cart is a moment where a visitor needs to
            know what happened and what to do, and "Nothing pressed out yet"
            above a button reading "Browse the sheets" answered neither in a
            vocabulary anyone shares. */}
        <div className="flex flex-col items-center py-10 text-center">
          <div className="diecut-arch aspect-4/5 w-[130px] border-2 border-dashed border-keyline/40" />
          <h1 className="type-sheet-display mt-8 text-[30px] text-keyline">
            Your cart is empty
          </h1>
          <p className="mt-3 max-w-[46ch] text-[15px] leading-[1.6] text-muted-foreground">
            Take a look around. Something handmade is waiting.
          </p>
          <div className="mt-8">
            <Button href="/shop">Browse the collection</Button>
          </div>
        </div>
      </Envelope>
    );
  }

  const total = subtotalCents + SHIPPING_CENTS;

  return (
    <Envelope>
      <h1 className="type-sheet-display text-[34px] text-keyline mb-2">
        Your cart
      </h1>
      <p className="type-sheet-spec text-keyline/60 mb-7">
        {items.length} {items.length === 1 ? "item" : "items"}
      </p>

      {/* No AnimatePresence, and that is the fix rather than a simplification.
          The rows were `motion.div`s with an exit tween, which made a line's
          presence in the DOM depend on an animation finishing: AnimatePresence
          holds an exiting child mounted until its tween settles, so a stalled
          or interrupted frame loop leaves a removed row drawn on screen. That
          was observed in the wild as a row that vanished, came back and went
          again, and reproduced here as a removed line still printing its own
          price beside a subtotal that had already dropped it.

          The previous attempt at this changed *which* property was animated
          (height to opacity, to stop `layout` projection fighting the tween).
          It could not have been enough: the tween was still in the unmount
          path. Nothing about whether a shopper's cart contains a line should
          be routed through the animation scheduler.

          It is also what this surface's own doctrine asks for. `/cart` is an
          Operate surface (see the Envelope note at the foot of this file) and
          drops every expressive move; the row list was the last one left. */}
      <div className="flex flex-col gap-1">
          {items.map((item) => (
            <div
              key={item.productId}
              // Two tiers below `sm`: the name/price block on its own row, the
              // controls on a second full-width row. The five controls used to
              // share one unwrapped line, which overflowed a 320px screen by
              // well over 100px. `flex-wrap` alone wouldn't do it — the
              // controls are a nested flex row, so that row is what has to go
              // full-width and redistribute.
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 py-[18px] px-1 border-b-2 border-keyline/15"
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
                  <div className="type-sheet-spec text-press-red mt-1.5">
                    All we have left
                  </div>
                )}
              </div>

              <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-[18px]">
                <div className="flex items-stretch border-2 border-keyline">
                  <button
                    type="button"
                    onClick={() => setQuantity(item.productId, item.quantity - 1)}
                    aria-label={`Decrease quantity of ${item.name}`}
                    className="flex h-11 w-11 items-center justify-center border-0 bg-transparent text-keyline cursor-pointer transition-colors duration-200 hover:bg-butter focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-press-red"
                  >
                    <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
                    </svg>
                  </button>
                  <span className="type-sheet-spec flex min-w-8 items-center justify-center border-x-2 border-keyline tabular-nums text-keyline">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    disabled={item.quantity >= Math.min(20, item.stockQty)}
                    onClick={() => setQuantity(item.productId, Math.min(20, item.stockQty, item.quantity + 1))}
                    aria-label={`Increase quantity of ${item.name}`}
                    className={`flex h-11 w-11 items-center justify-center border-0 bg-transparent text-keyline transition-colors duration-200 enabled:hover:bg-butter focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-press-red ${
                      item.quantity >= Math.min(20, item.stockQty)
                        ? "cursor-not-allowed opacity-40"
                        : "cursor-pointer opacity-100"
                    }`}
                  >
                    <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
                    </svg>
                  </button>
                </div>
                <div className="text-[15px] min-w-[76px] text-right tabular-nums text-keyline">
                  {formatPrice(item.priceCents * item.quantity)}
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  aria-label={`Remove ${item.name} from cart`}
                  className="type-sheet-spec bg-transparent border-0 cursor-pointer text-keyline/60 underline underline-offset-4 transition-colors duration-200 hover:text-press-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
      </div>

      <div className="mt-8 flex flex-col gap-2 border-t-2 border-keyline pt-6 text-[15px]">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatPrice(subtotalCents)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Shipping</span>
          <span className="tabular-nums">{formatPrice(SHIPPING_CENTS)}</span>
        </div>
        <div className="type-sheet-display mt-2 flex justify-between text-[24px] text-keyline">
          <span>Total</span>
          <span className="tabular-nums">{formatPrice(total)}</span>
        </div>
      </div>

      {/* `prefetch` is explicit because /checkout is a dynamic route: it awaits
          auth() and then listAddresses(), so Next's default treatment leaves
          the work to click time. Anyone looking at a filled cart is very likely
          to go there next, and warming it now turns the slowest hop in the
          purchase flow into a mostly-resolved one. */}
      <Button href="/checkout" prefetch className="mt-8 w-full text-center">
        Proceed to checkout
      </Button>
    </Envelope>
  );
}

/* The envelope the pressed-out figures go into.
 *
 * This is an Operate surface, so it keeps the palette, the type and the 2px
 * key rule and drops every expressive move: no lift, no die-cut ornament, no
 * dashed cut lines. The discipline the direction was chosen under is that
 * nothing wobbles where somebody is about to type a card number, and the cart
 * is the first page of that flow.
 */
function Envelope({
  children,
  ...rest
}: { children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section className="bg-sheet">
      <div className="page-gutter py-10 sm:py-14" {...rest}>
        <div className="max-w-[800px] mx-auto">{children}</div>
      </div>
    </section>
  );
}
