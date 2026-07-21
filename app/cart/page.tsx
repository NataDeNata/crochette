"use client";

import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/lib/cart/CartContext";
import { SHIPPING_CENTS } from "@/lib/cart/constants";
import { formatPrice } from "@/lib/data/products";

export default function CartPage() {
  const { items, removeItem, setQuantity, subtotalCents } = useCart();
  const reduceMotion = useReducedMotion();

  if (items.length === 0) {
    return (
      <section style={{ padding: "80px 48px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 32, margin: "0 0 12px" }}>
          Your cart is empty
        </h1>
        <p style={{ fontSize: 14.5, color: "oklch(0.5 0.02 60)", marginBottom: 28 }}>
          Take a look around the shop — something handmade is waiting.
        </p>
        <Button href="/shop">Browse the shop</Button>
      </section>
    );
  }

  const total = subtotalCents + SHIPPING_CENTS;

  return (
    <section style={{ padding: "48px 48px 96px", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 34, margin: "0 0 28px" }}>
        Your cart
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.productId}
              layout={!reduceMotion}
              initial={reduceMotion ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "18px 4px",
                borderBottom: "1px solid oklch(0.92 0.015 60)",
              }}
            >
              <div>
                <Link href={`/shop/${item.slug}`} style={{ fontSize: 15, fontWeight: 500, color: "inherit" }}>
                  {item.name}
                </Link>
                <div style={{ fontSize: 13, color: "oklch(0.5 0.02 60)", marginTop: 3 }}>
                  {formatPrice(item.priceCents)} each
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1.5px solid oklch(0.9 0.02 60)",
                    borderRadius: 24,
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setQuantity(item.productId, item.quantity - 1)}
                    aria-label={`Decrease quantity of ${item.name}`}
                    style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer" }}
                  >
                    −
                  </button>
                  <span style={{ fontSize: 13.5, minWidth: 16, textAlign: "center" }}>{item.quantity}</span>
                  <button
                    type="button"
                    disabled={item.quantity >= Math.min(20, item.stockQty)}
                    onClick={() => setQuantity(item.productId, Math.min(20, item.stockQty, item.quantity + 1))}
                    aria-label={`Increase quantity of ${item.name}`}
                    style={{
                      padding: "8px 12px",
                      background: "none",
                      border: "none",
                      cursor: item.quantity >= Math.min(20, item.stockQty) ? "not-allowed" : "pointer",
                      opacity: item.quantity >= Math.min(20, item.stockQty) ? 0.4 : 1,
                    }}
                  >
                    +
                  </button>
                </div>
                {item.quantity >= item.stockQty && (
                  <span style={{ fontSize: 12, color: "oklch(0.55 0.15 40)" }}>Max in stock</span>
                )}

                <div style={{ fontSize: 14.5, minWidth: 70, textAlign: "right" }}>
                  {formatPrice(item.priceCents * item.quantity)}
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  aria-label={`Remove ${item.name} from cart`}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "oklch(0.55 0.02 60)", fontSize: 13 }}
                >
                  Remove
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 8, fontSize: 14.5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: "oklch(0.5 0.02 60)" }}>
          <span>Subtotal</span>
          <span>{formatPrice(subtotalCents)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "oklch(0.5 0.02 60)" }}>
          <span>Shipping</span>
          <span>{formatPrice(SHIPPING_CENTS)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 500, marginTop: 6 }}>
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
