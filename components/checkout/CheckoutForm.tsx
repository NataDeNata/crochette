"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { submitCheckout } from "@/app/checkout/actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { useCart } from "@/lib/cart/CartContext";
import { SHIPPING_CENTS } from "@/lib/cart/constants";
import { formatPrice } from "@/lib/data/products";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";

const inputStyle = {
  padding: "14px 18px",
  borderRadius: 12,
  border: "1.5px solid oklch(0.75 0.03 20)",
  background: "oklch(0.98 0.01 85)",
  fontSize: 14,
  fontFamily: "inherit",
} as const;

export function CheckoutForm() {
  const router = useRouter();
  const { items, subtotalCents } = useCart();
  const [state, formAction, isPending] = useActionState(submitCheckout, IDLE_STATE);
  const fieldErrors = state.fieldErrors ?? {};

  // A direct nav to /checkout with nothing in the cart has nothing to buy.
  useEffect(() => {
    if (items.length === 0 && !isPending) router.replace("/cart");
  }, [items.length, isPending, router]);

  if (items.length === 0) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 48, maxWidth: 900, margin: "0 auto" }}>
      <motion.form
        action={formAction}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <input type="hidden" name="cart" value={JSON.stringify(items.map((i) => ({ productId: i.productId, quantity: i.quantity })))} />

        <h2 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 22, margin: "0 0 4px" }}>
          Contact
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input name="name" placeholder="Full name" style={inputStyle} />
          <FieldError error={fieldErrors.name?.[0]} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input name="email" placeholder="Email address" type="email" style={inputStyle} />
          <FieldError error={fieldErrors.email?.[0]} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input name="phone" placeholder="Phone number (optional)" style={inputStyle} />
          <FieldError error={fieldErrors.phone?.[0]} />
        </div>

        <h2 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 22, margin: "18px 0 4px" }}>
          Shipping address
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input name="shippingLine1" placeholder="Street address" style={inputStyle} />
          <FieldError error={fieldErrors.shippingLine1?.[0]} />
        </div>
        <input name="shippingLine2" placeholder="Apartment, suite, etc. (optional)" style={inputStyle} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input name="shippingCity" placeholder="City" style={inputStyle} />
          <FieldError error={fieldErrors.shippingCity?.[0]} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <input name="shippingProvince" placeholder="Province" style={inputStyle} />
            <FieldError error={fieldErrors.shippingProvince?.[0]} />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <input name="shippingPostalCode" placeholder="Postal code" style={inputStyle} />
            <FieldError error={fieldErrors.shippingPostalCode?.[0]} />
          </div>
        </div>

        <FieldError error={state.status === "error" ? state.message : undefined} />

        <SubmitButton isPending={isPending} label="Continue to payment" pendingLabel="Preparing checkout…" />
      </motion.form>

      <div>
        <h2 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 22, margin: "0 0 16px" }}>
          Order summary
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((item) => (
            <div key={item.productId} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
              <span>
                {item.name} <span style={{ color: "oklch(0.55 0.02 60)" }}>× {item.quantity}</span>
              </span>
              <span>{formatPrice(item.priceCents * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid oklch(0.92 0.015 60)", display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "oklch(0.5 0.02 60)" }}>
            <span>Subtotal</span>
            <span>{formatPrice(subtotalCents)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "oklch(0.5 0.02 60)" }}>
            <span>Shipping</span>
            <span>{formatPrice(SHIPPING_CENTS)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 500, marginTop: 4 }}>
            <span>Total</span>
            <span>{formatPrice(subtotalCents + SHIPPING_CENTS)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
