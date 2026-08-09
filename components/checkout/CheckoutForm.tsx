"use client";

import { useActionState, useEffect, useState, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { submitCheckout } from "@/app/checkout/actions";
import { IDLE_STATE, type FormActionState } from "@/lib/actions/types";
import { useCart } from "@/lib/cart/CartContext";
import { SHIPPING_CENTS } from "@/lib/cart/constants";
import { formatPrice } from "@/lib/data/products";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";
import { TextField } from "@/components/forms/TextField";
import { CheckoutFormSkeleton } from "@/components/checkout/CheckoutFormSkeleton";

const fieldClassName =
  "h-auto rounded-none border-2 border-keyline bg-sheet px-4 py-3.5 text-sm text-keyline placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red";

const EMPTY: ReadonlySet<string> = new Set();

/** Bound once so every field below carries the sheet's own 2px keyline. */
function Field(props: ComponentProps<typeof TextField>) {
  return <TextField {...props} className={cn(fieldClassName, props.className)} />;
}

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
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  /* Errors the shopper has since answered.
   *
   * These inputs are uncontrolled and the errors come back from a Server
   * Action, so nothing in the form knew a field had been corrected until the
   * next submit. Fill every field in correctly after a failed submit and six
   * red errors still sat under six valid values — the form crying wolf at the
   * exact moment it asks for ₱4,850.
   *
   * `submitCheckout` does refuse a genuinely invalid submit (the Zod parse is
   * the gate, and it has always run), so what was broken here is the display
   * and not the guard. Typing in a field retracts that field's error; the next
   * server response replaces the whole set. */
  const [answered, setAnswered] = useState<{
    verdict: FormActionState;
    names: ReadonlySet<string>;
  }>(() => ({ verdict: state, names: new Set() }));

  /* Retractions are stamped with the verdict they were retracting, and any
   * newer verdict discards them wholesale — rather than an effect clearing
   * them after the fact, which would render one frame of stale-but-retracted
   * errors and cost a second render to fix.
   *
   * Identity, not contents: `useActionState` returns a fresh object per run,
   * so a second submit producing the same errors is still a new verdict and
   * must un-retract anything the shopper has not actually fixed. */
  const retracted = answered.verdict === state ? answered.names : EMPTY;

  /* What to refill each field with.
   *
   * React 19 resets an uncontrolled `<form action={…}>` once the action
   * returns — so on a rejected submit every field emptied itself, and the
   * shopper retyped a full address to correct one line, at the step before
   * paying. `submitCheckout` now echoes the submission back and this is what
   * React resets *to*. Ordering: what they just typed, then a saved address
   * they picked, then the account's own details. */
  const submitted = state.values;
  const refill = (name: string, fallback?: string) => submitted?.[name] ?? fallback;

  const fieldErrors = state.fieldErrors ?? {};
  const errorFor = (name: string) =>
    retracted.has(name) ? undefined : fieldErrors[name]?.[0];
  const clear = (name: string) => () =>
    setAnswered((prev) => {
      const names = prev.verdict === state ? prev.names : EMPTY;
      if (names.has(name)) return prev;
      return { verdict: state, names: new Set(names).add(name) };
    });

  // A direct nav to /checkout with nothing in the cart has nothing to buy.
  // Gated on `loaded`: the cart now lives on the server, and React runs this
  // child effect before CartProvider's hydrate effect, so without the guard an
  // empty first render bounced every checkout straight back to /cart.
  useEffect(() => {
    if (loaded && items.length === 0 && !isPending) router.replace("/cart");
  }, [loaded, items.length, isPending, router]);

  // Before the store's first read there is nothing truthful to show: the cart
  // lives on the server, so `items` is still [] and `subtotalCents` still 0.
  // Rendering the real form here paints "Subtotal ₱0 / Total ₱100" for a frame
  // against a cart that may be full. The skeleton is the same one loading.tsx
  // uses, so the placeholder simply stays on screen across hydration instead of
  // flickering through a wrong total.
  if (!loaded) return <CheckoutFormSkeleton />;

  if (items.length === 0) return null;

  return (
    // `min(320px,100%)` rather than a flat 320px: auto-fit collapses the track
    // *count* to one on a narrow screen, but the surviving track keeps its
    // 320px minimum and overflows a container narrower than that. The min()
    // lets the floor fall away exactly when it stops fitting.
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-8 sm:gap-12 max-w-[900px] mx-auto">
      {/* `.sheet-reveal` rather than a Framer entrance. This form was mounting
          at `opacity: 0` and animating up, which made the checkout form's
          visibility depend on an animation completing — measured at 0.65
          opacity and stuck, in a tab running one frame every few seconds. The
          CSS keyframe has no fill-mode, so the resting state is visible and
          the fade is additive. See globals.css. */}
      <form action={formAction} className="sheet-reveal flex flex-col gap-3.5">
        {/* The cart is no longer submitted with the form — submitCheckout reads
            it from the database, so the client can't influence what is bought.
            `items` is still used above for the order summary and the
            empty-cart redirect. */}

        <h2 className="type-sheet-display text-[22px] text-keyline mb-1">Contact</h2>
        <Field
          id="checkout-name"
          name="name"
          label="Full name"
          autoComplete="name"
          required
          defaultValue={refill("name", defaultName)}
          error={errorFor("name")}
          onClear={clear("name")}
        />
        <Field
          id="checkout-email"
          name="email"
          label="Email address"
          type="email"
          autoComplete="email"
          required
          defaultValue={refill("email", defaultEmail)}
          error={errorFor("email")}
          onClear={clear("email")}
        />
        <Field
          id="checkout-phone"
          name="phone"
          label="Phone number (optional)"
          type="tel"
          autoComplete="tel"
          defaultValue={refill("phone")}
          error={errorFor("phone")}
          onClear={clear("phone")}
        />

        <h2 className="type-sheet-display text-[22px] text-keyline mt-[18px] mb-1">Shipping address</h2>

        {addresses.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="checkout-saved-address" className="type-sheet-spec text-keyline/60">
              Saved addresses
            </label>
            <select
              id="checkout-saved-address"
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
          </div>
        )}

        {/* A picked saved address beats a rejected submission: the key below
            remounts these fields on every pick, and choosing an address is a
            later, more deliberate act than whatever was typed before the
            submit that failed. */}
        <div key={selectedAddressId || "new"} className="flex flex-col gap-3.5">
          <Field
            id="checkout-line1"
            name="shippingLine1"
            label="Street address"
            autoComplete="address-line1"
            required
            defaultValue={selectedAddress?.line1 ?? refill("shippingLine1")}
            error={errorFor("shippingLine1")}
            onClear={clear("shippingLine1")}
          />
          <Field
            id="checkout-line2"
            name="shippingLine2"
            label="Apartment, suite, etc. (optional)"
            autoComplete="address-line2"
            defaultValue={selectedAddress ? selectedAddress.line2 ?? "" : refill("shippingLine2")}
            error={errorFor("shippingLine2")}
            onClear={clear("shippingLine2")}
          />
          <Field
            id="checkout-city"
            name="shippingCity"
            label="City"
            autoComplete="address-level2"
            required
            defaultValue={selectedAddress?.city ?? refill("shippingCity")}
            error={errorFor("shippingCity")}
            onClear={clear("shippingCity")}
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <Field
                id="checkout-province"
                name="shippingProvince"
                label="Province"
                autoComplete="address-level1"
                required
                defaultValue={selectedAddress?.province ?? refill("shippingProvince")}
                error={errorFor("shippingProvince")}
                onClear={clear("shippingProvince")}
              />
            </div>
            <div className="flex-1">
              <Field
                id="checkout-postal"
                name="shippingPostalCode"
                label="Postal code"
                autoComplete="postal-code"
                inputMode="numeric"
                required
                defaultValue={selectedAddress?.postalCode ?? refill("shippingPostalCode")}
                error={errorFor("shippingPostalCode")}
                onClear={clear("shippingPostalCode")}
              />
            </div>
          </div>
        </div>

        <h2 className="type-sheet-display text-[22px] text-keyline mt-[18px] mb-1">Discount code</h2>
        <Field
          id="checkout-discount"
          name="discountCode"
          label="Discount code (optional)"
          className="uppercase"
          defaultValue={refill("discountCode")}
          error={errorFor("discountCode")}
          onClear={clear("discountCode")}
        />

        <FieldError error={state.status === "error" ? state.message : undefined} />

        <SubmitButton isPending={isPending} label="Continue to payment" pendingLabel="Preparing checkout…" />
      </form>

      <div>
        <h2 className="type-sheet-display text-[22px] text-keyline mb-4">Order summary</h2>
        <div className="flex flex-col gap-2.5">
          {items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm">
              <span>
                {item.name} <span className="text-muted-foreground">× {item.quantity}</span>
              </span>
              <span>{formatPrice(item.priceCents * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-[18px] pt-3.5 border-t-2 border-keyline flex flex-col gap-2 text-sm">
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
