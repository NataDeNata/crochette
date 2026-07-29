"use client";

import { create } from "zustand";
import type { CartLine, CartView } from "@/lib/db/cart";
import {
  addToCart,
  emptyCart,
  getCart,
  removeFromCart,
  setCartItemQuantity,
} from "@/app/cart/actions";

/**
 * Client mirror of the server-owned cart.
 *
 * The pattern is optimistic-then-authoritative: mutate local state immediately
 * so the UI never waits on a round trip, fire the Server Action, then replace
 * state wholesale with what the server returns. The server is always the
 * source of truth — the optimistic value only has to be a good guess, which is
 * why the local arithmetic here can be simpler than lib/db/cart.ts's.
 *
 * State is replaced rather than merged on response, so items that vanish
 * server-side (product drafted or deleted mid-session) disappear here too
 * rather than lingering because nothing told us to remove them.
 */

export type CartState = {
  lines: CartLine[];
  subtotalCents: number;
  count: number;
  /** True while at least one mutation is in flight. Lets the UI disable
   * checkout during a sync without blocking cart edits themselves. */
  syncing: boolean;
  /** False until the first server response, so the UI can tell "empty cart"
   * apart from "haven't looked yet". */
  loaded: boolean;

  hydrate: (view: CartView) => void;
  refresh: () => Promise<void>;
  add: (line: Omit<CartLine, "quantity">, quantity: number) => Promise<void>;
  setQuantity: (productId: string, quantity: number) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  clear: () => Promise<void>;
};

function totals(lines: CartLine[]) {
  return {
    subtotalCents: lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0),
    count: lines.reduce((sum, l) => sum + l.quantity, 0),
  };
}

/** Debounce per product id, so holding the quantity stepper fires one request
 * at the end rather than one per click. Keyed per product because two
 * different rows being adjusted must not cancel each other. */
const pendingQuantityTimers = new Map<string, ReturnType<typeof setTimeout>>();
const QUANTITY_DEBOUNCE_MS = 400;

export const useCartStore = create<CartState>((set, get) => {
  /** Run a server action, reconciling state from its response.
   *
   * On failure the local optimistic state is deliberately LEFT ALONE rather
   * than rolled back: a network blip shouldn't yank items out from under
   * someone mid-edit, and the next successful call re-syncs everything anyway.
   * Checkout re-reads the cart server-side regardless, so a stale client can
   * never turn into a wrong charge. */
  async function sync(run: () => Promise<CartView>) {
    set({ syncing: true });
    try {
      const view = await run();
      set({ lines: view.lines, ...totals(view.lines), loaded: true });
    } catch {
      // Swallowed on purpose — see above.
    } finally {
      set({ syncing: false });
    }
  }

  return {
    lines: [],
    subtotalCents: 0,
    count: 0,
    syncing: false,
    loaded: false,

    hydrate: (view) => set({ lines: view.lines, ...totals(view.lines), loaded: true }),

    refresh: () => sync(() => getCart()),

    add: async (line, quantity) => {
      const lines = [...get().lines];
      const index = lines.findIndex((l) => l.productId === line.productId);
      const ceiling = Math.max(0, line.stockQty);

      if (index >= 0) {
        lines[index] = {
          ...lines[index],
          quantity: Math.min(lines[index].quantity + quantity, ceiling),
        };
      } else if (quantity > 0 && ceiling > 0) {
        lines.push({ ...line, quantity: Math.min(quantity, ceiling) });
      }
      set({ lines, ...totals(lines) });

      await sync(() => addToCart(line.productId, quantity));
    },

    setQuantity: async (productId, quantity) => {
      const lines =
        quantity <= 0
          ? get().lines.filter((l) => l.productId !== productId)
          : get().lines.map((l) =>
              l.productId === productId
                ? { ...l, quantity: Math.min(quantity, Math.max(0, l.stockQty)) }
                : l,
            );
      set({ lines, ...totals(lines) });

      const existing = pendingQuantityTimers.get(productId);
      if (existing) clearTimeout(existing);

      pendingQuantityTimers.set(
        productId,
        setTimeout(() => {
          pendingQuantityTimers.delete(productId);
          void sync(() => setCartItemQuantity(productId, quantity));
        }, QUANTITY_DEBOUNCE_MS),
      );
    },

    remove: async (productId) => {
      // A pending debounced quantity write would otherwise land after the
      // delete and resurrect the row.
      const pending = pendingQuantityTimers.get(productId);
      if (pending) {
        clearTimeout(pending);
        pendingQuantityTimers.delete(productId);
      }

      const lines = get().lines.filter((l) => l.productId !== productId);
      set({ lines, ...totals(lines) });

      await sync(() => removeFromCart(productId));
    },

    clear: async () => {
      for (const timer of pendingQuantityTimers.values()) clearTimeout(timer);
      pendingQuantityTimers.clear();

      set({ lines: [], subtotalCents: 0, count: 0 });
      await sync(() => emptyCart());
    },
  };
});
