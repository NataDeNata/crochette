"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { submitCheckout } from "@/app/checkout/actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { useCart } from "@/lib/cart/CartContext";
import { SHIPPING_CENTS } from "@/lib/cart/constants";
import { formatPrice } from "@/lib/data/products";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";
import { Input } from "@/components/ui/input";

const fieldClassName = "h-auto rounded-xl border-[1.5px] border-[oklch(0.75_0.03_20)] bg-[oklch(0.98_0.01_85)] px-[18px] py-3.5 text-sm";

export type SavedAddress = {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postalCode: string;
};

export function CheckoutForm({
  addresses = [],
  defaultName = "",
  defaultEmail = "",
}: {
  addresses?: SavedAddress[];
  defaultName?: string;
  defaultEmail?: string;
}) {
  const router = useRouter();
  const { items, subtotalCents, loaded } = useCart();
  const [state, formAction, isPending] = useActionState(submitCheckout, IDLE_STATE);
  const fieldErrors = state.fieldErrors ?? {};
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  // A direct nav to /checkout with nothing in the cart has nothing to buy.
  // Gated on `loaded`: the cart now lives on the server, and React runs this
  // child effect before CartProvider's hydrate effect, so without the guard an
  // empty first render bounced every checkout straight back to /cart.
  useEffect(() => {
    if (loaded && items.length === 0 && !isPending) router.replace("/cart");
  }, [loaded, items.length, isPending, router]);

  if (loaded && items.length === 0) return null;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-12 max-w-[900px] mx-auto">
      <motion.form
        action={formAction}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-3.5"
      >
        {/* The cart is no longer submitted with the form — submitCheckout reads
            it from the database, so the client can't influence what is bought.
            `items` is still used above for the order summary and the
            empty-cart redirect. */}

        <h2 className="font-serif font-medium text-[22px] mb-1">Contact</h2>
        <div className="flex flex-col gap-1.5">
          <Input name="name" placeholder="Full name" defaultValue={defaultName} className={fieldClassName} />
          <FieldError error={fieldErrors.name?.[0]} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Input name="email" placeholder="Email address" type="email" defaultValue={defaultEmail} className={fieldClassName} />
          <FieldError error={fieldErrors.email?.[0]} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Input name="phone" placeholder="Phone number (optional)" className={fieldClassName} />
          <FieldError error={fieldErrors.phone?.[0]} />
        </div>

        <h2 className="font-serif font-medium text-[22px] mt-[18px] mb-1">Shipping address</h2>

        {addresses.length > 0 && (
          <select
            value={selectedAddressId}
            onChange={(e) => setSelectedAddressId(e.target.value)}
            className={`${fieldClassName} appearance-auto`}
          >
            <option value="">Enter a new address</option>
            {addresses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label || a.line1}
              </option>
            ))}
          </select>
        )}

        <div key={selectedAddressId || "new"} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Input name="shippingLine1" placeholder="Street address" defaultValue={selectedAddress?.line1} className={fieldClassName} />
            <FieldError error={fieldErrors.shippingLine1?.[0]} />
          </div>
          <Input
            name="shippingLine2"
            placeholder="Apartment, suite, etc. (optional)"
            defaultValue={selectedAddress?.line2 ?? ""}
            className={fieldClassName}
          />
          <div className="flex flex-col gap-1.5">
            <Input name="shippingCity" placeholder="City" defaultValue={selectedAddress?.city} className={fieldClassName} />
            <FieldError error={fieldErrors.shippingCity?.[0]} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <Input name="shippingProvince" placeholder="Province" defaultValue={selectedAddress?.province} className={fieldClassName} />
              <FieldError error={fieldErrors.shippingProvince?.[0]} />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <Input
                name="shippingPostalCode"
                placeholder="Postal code"
                defaultValue={selectedAddress?.postalCode}
                className={fieldClassName}
              />
              <FieldError error={fieldErrors.shippingPostalCode?.[0]} />
            </div>
          </div>
        </div>

        <h2 className="font-serif font-medium text-[22px] mt-[18px] mb-1">Discount code</h2>
        <div className="flex flex-col gap-1.5">
          <Input name="discountCode" placeholder="Optional code" className={`${fieldClassName} uppercase`} />
          <FieldError error={fieldErrors.discountCode?.[0]} />
        </div>

        <FieldError error={state.status === "error" ? state.message : undefined} />

        <SubmitButton isPending={isPending} label="Continue to payment" pendingLabel="Preparing checkout…" />
      </motion.form>

      <div>
        <h2 className="font-serif font-medium text-[22px] mb-4">Order summary</h2>
        <div className="flex flex-col gap-2.5">
          {items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm">
              <span>
                {item.name} <span className="text-[oklch(0.55_0.02_60)]">× {item.quantity}</span>
              </span>
              <span>{formatPrice(item.priceCents * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-[18px] pt-3.5 border-t border-[oklch(0.92_0.015_60)] flex flex-col gap-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatPrice(subtotalCents)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Shipping</span>
            <span>{formatPrice(SHIPPING_CENTS)}</span>
          </div>
          <div className="flex justify-between text-[17px] font-medium mt-1">
            <span>Total</span>
            <span>{formatPrice(subtotalCents + SHIPPING_CENTS)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
