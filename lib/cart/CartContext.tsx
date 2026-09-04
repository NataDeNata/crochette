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
 * Most mutators still return void: the optimistic update in the store has
 * already applied by the time they return, so nothing is worth awaiting.
 * `addItem` is the one exception — see its own note below.
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
  /**
   * Resolves once the server has confirmed the add — not on the optimistic
   * update, which has already applied to `items` before this is even called.
   * Await it to know when it is honest to say "added" rather than "adding";
   * see AddToCartButton and Cutout's quick-add for the two callers that do.
   * Never rejects: a failed sync is swallowed in the store (see its
   * `reconcile`), so the promise always settles.
   */
  addItem: (
    product: { id: string; slug: string; name: string; priceCents: number; stockQty: number },
    quantity: number,
  ) => Promise<void>;
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
  /**
   * True while any write is running or sitting on the quantity debounce.
   *
   * For a "cart is still catching up" indicator — disabling checkout, showing
   * an "Updating…" line — rather than for gating a specific row: it is one
   * flag for the whole cart, not per line, so it cannot say *which* item is
   * mid-write. A per-button spinner on add/remove is driven by that call's own
   * promise instead (see `addItem`'s note), which this flag does not replace.
   */
  syncing: boolean;
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
    //
    // This deliberately still runs on every new `initialCart`, which is a fresh
    // object on every RSC payload and therefore also on payloads older than
    // what the client already knows — a prefetch, a back navigation, the
    // re-render a cookie-writing Server Action triggers. Filtering those here
    // would only cover this one call site; `hydrate` refuses them in the store
    // instead, where every hydration path gets the same guard. See its note in
    // lib/cart/store.ts for which snapshots are refused and why.
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
  const syncing = useCartStore((s) => s.syncing);
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
      syncing,
      addItem: (product, quantity) => {
        /* The toast fires after `add` resolves, not on the click — the
         * reverse of how this used to work. It used to fire on intent, on the
         * reasoning that a failed sync leaves the optimistic line in place
         * and checkout re-reads and re-prices regardless, so nothing about the
         * announcement's timing could turn into a wrong charge. True then and
         * still true, but the buttons that call this now show their own
         * spinner-then-confirmed state for the same reason: not because
         * getting it wrong was dangerous, but because "Added" printed on
         * intent isn't yet true when it's said. The toast is that same
         * standard applied to the one confirmation a shopper is not looking
         * at when it happens.
         *
         * The promise this returns never rejects (see `add`'s note in
         * store.ts), so the toast always fires — the `.then` is sequencing,
         * not error handling. */
        return add(
          {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            priceCents: product.priceCents,
            stockQty: product.stockQty,
          },
          quantity,
        ).then(() => {
          toast.success(`${product.name} added to your cart`, {
            action: { label: "View cart", onClick: () => router.push("/cart") },
          });
        });
      },
      removeItem: (productId) => void removeInStore(productId),
      setQuantity: (productId, quantity) => void setQuantityInStore(productId, quantity),
      clear: () => void clearInStore(),
    }),
    [
      lines,
      subtotalCents,
      count,
      loaded,
      syncing,
      add,
      setQuantityInStore,
      removeInStore,
      clearInStore,
      router,
    ],
  );
}
