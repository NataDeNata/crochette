"use client";

import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/CartContext";
import { SHIPPING_CENTS } from "@/lib/cart/constants";
import { formatPrice } from "@/lib/data/products";

export default function CartPage() {
  const { items, removeItem, setQuantity, subtotalCents } = useCart();
  const reduceMotion = useReducedMotion();

  if (items.length === 0) {
    return (
      <section className="py-20 px-12 text-center">
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
    <section className="pt-12 px-12 pb-24 max-w-[800px] mx-auto">
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
              className="flex items-center justify-between gap-4 py-[18px] px-1 border-b border-[oklch(0.92_0.015_60)]"
            >
              <div>
                <Link href={`/shop/${item.slug}`} className="text-[15px] font-medium text-inherit">
                  {item.name}
                </Link>
                <div className="text-[13px] text-muted-foreground mt-0.75">
                  {formatPrice(item.priceCents)} each
                </div>
              </div>

              <div className="flex items-center gap-[18px]">
                <div className="flex items-center border-[1.5px] border-[oklch(0.9_0.02_60)] rounded-[24px] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity(item.productId, item.quantity - 1)}
                    aria-label={`Decrease quantity of ${item.name}`}
                    className="py-2 px-3 bg-transparent border-0 cursor-pointer"
                  >
                    −
                  </button>
                  <span className="text-[13.5px] min-w-4 text-center">{item.quantity}</span>
                  <button
                    type="button"
                    disabled={item.quantity >= Math.min(20, item.stockQty)}
                    onClick={() => setQuantity(item.productId, Math.min(20, item.stockQty, item.quantity + 1))}
                    aria-label={`Increase quantity of ${item.name}`}
                    className={`py-2 px-3 bg-transparent border-0 ${
                      item.quantity >= Math.min(20, item.stockQty)
                        ? "cursor-not-allowed opacity-40"
                        : "cursor-pointer opacity-100"
                    }`}
                  >
                    +
                  </button>
                </div>
                {item.quantity >= item.stockQty && (
                  <span className="text-xs text-[oklch(0.55_0.15_40)]">Max in stock</span>
                )}

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

      <Button href="/checkout" className="block w-full text-center mt-7 text-[15px]">
        Proceed to checkout
      </Button>
    </section>
  );
}
