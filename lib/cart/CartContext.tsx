"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCartStore } from "./store";
import type { CartView } from "@/lib/db/cart";

/**
 * Compatibility shim over the Zustand store.
 *
 * The cart moved from localStorage to the database (see lib/db/cart.ts), but
 * `useCart()` keeps its original signature so the five consumers —
 * app/cart/page.tsx, AddToCartButton, CartIcon, CheckoutForm, ProductCard —
 * need no changes. That keeps the storage swap reviewable on its own instead of
 * spreading across the UI at the same time.
 *
 * The mutators still return void. They're now async underneath, but no caller
 * awaits them and none should: the optimistic update in the store has already
 * applied by the time they return, which is the whole point.
 */

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  quantity: number;
  stockQty: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (
    product: { id: string; slug: string; name: string; priceCents: number; stockQty: number },
    quantity: number,
  ) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  subtotalCents: number;
  count: number;
  /**
   * False until the cart has been read at least once.
   *
   * Callers that act on an EMPTY cart must gate on this. React runs child
   * effects before parent effects, so a child sees the store still empty on
   * first render even though CartProvider is about to hydrate it — /checkout
   * bounced straight back to /cart because of exactly that.
   */
  loaded: boolean;
};

/**
 * Seeds the store from a cart read on the server during render.
 *
 * Without this the badge would paint 0 and then pop to its real value once a
 * client fetch resolved. It is NOT a React context — the store is module-level
 * — but it stays a provider-shaped component so app/layout.tsx keeps the same
 * shape and can hand down server-rendered state.
 */
export function CartProvider({
  children,
  initialCart,
}: {
  children: ReactNode;
  initialCart?: CartView;
}) {
  const hydrate = useCartStore((s) => s.hydrate);
  const refresh = useCartStore((s) => s.refresh);
  const importLegacy = useCartStore((s) => s.importLegacy);

  useEffect(() => {
    // Server-rendered cart is preferred: it paints the badge correctly on the
    // first frame. Falling back to a client read keeps the cart correct even
    // where the server hasn't supplied one, at the cost of a brief empty state.
    if (initialCart) hydrate(initialCart);
    else void refresh();
  }, [initialCart, hydrate, refresh]);

  // Separate effect, and deliberately not merged with the one above: this runs
  // once per browser ever, while the hydrate effect re-runs whenever the
  // server-rendered cart changes.
  useEffect(() => {
    void importLegacy();
  }, [importLegacy]);

  return <>{children}</>;
}

export function useCart(): CartContextValue {
  const router = useRouter();
  const lines = useCartStore((s) => s.lines);
  const subtotalCents = useCartStore((s) => s.subtotalCents);
  const count = useCartStore((s) => s.count);
  const loaded = useCartStore((s) => s.loaded);
  const add = useCartStore((s) => s.add);
  const setQuantityInStore = useCartStore((s) => s.setQuantity);
  const removeInStore = useCartStore((s) => s.remove);
  const clearInStore = useCartStore((s) => s.clear);

  return useMemo(
    () => ({
      items: lines,
      subtotalCents,
      count,
      loaded,
      addItem: (product, quantity) => {
        void add(
          {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            priceCents: product.priceCents,
            stockQty: product.stockQty,
          },
          quantity,
        );
        /* The only confirmation used to be the nav badge incrementing — a
         * two-character change in the far corner of the screen, away from
         * where the click happened, and invisible to anyone not watching for
         * it. Raised here rather than in each button so the product page's
         * "Add to cart" and the card's quick-add can't drift apart, and so a
         * third entry point gets it for free.
         *
         * Deliberately fired on intent, not on the server's reply: the store
         * is optimistic-then-authoritative by design, a failed sync leaves the
         * optimistic line in place, and checkout re-reads and re-prices the
         * cart server-side regardless. */
        toast.success(`${product.name} added to your cart`, {
          action: { label: "View cart", onClick: () => router.push("/cart") },
        });
      },
      removeItem: (productId) => void removeInStore(productId),
      setQuantity: (productId, quantity) => void setQuantityInStore(productId, quantity),
      clear: () => void clearInStore(),
    }),
    [lines, subtotalCents, count, loaded, add, setQuantityInStore, removeInStore, clearInStore, router],
  );
}
