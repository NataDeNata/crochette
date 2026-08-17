"use client";

import { create } from "zustand";
import type { CartLine, CartView } from "@/lib/db/cart";
import {
  addToCart,
  emptyCart,
  getCart,
  importLegacyCart,
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
  /** True while at least one mutation is in flight *or* debounced and waiting to
   * fire. Counting the debounce wait is deliberate: see `pendingWrites` below.
   *
   * NOTHING READS THIS YET, and the previous version of this comment said it
   * "lets the UI disable checkout during a sync" as though something did.
   * `CartContext` selects lines/subtotal/count/loaded/add/setQuantity/remove/
   * clear and not this, so no component has ever seen it. That mattered: it is
   * the sentence a review believed, and the reason this field was described as
   * letting a shopper reach checkout mid-write — a consequence that cannot
   * currently happen, because there is no gate to be wrong.
   *
   * Kept, and kept correct, because it is the honest signal for the first
   * consumer that wants one (a disabled checkout button, a sync indicator) and
   * a field that lies the day it is first read is worse than no field. Wire it
   * up rather than re-deriving it. */
  syncing: boolean;
  /** False until the first server response, so the UI can tell "empty cart"
   * apart from "haven't looked yet". */
  loaded: boolean;

  hydrate: (view: CartView) => void;
  refresh: () => Promise<void>;
  /** One-time import of a pre-database cart left in localStorage. */
  importLegacy: () => Promise<void>;
  add: (line: Omit<CartLine, "quantity">, quantity: number) => Promise<void>;
  /** Fire-and-forget on purpose, and NOT a promise: the server write is
   * debounced, so there is nothing meaningful for a caller to await. Watch
   * `syncing` instead — it is true from the moment the write is scheduled. */
  setQuantity: (productId: string, quantity: number) => void;
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
  /** How many writes are outstanding — either running, or scheduled on a
   * debounce timer and not yet fired.
   *
   * A count rather than a plain boolean, for two reasons:
   *
   * 1. Overlap. `set({ syncing: false })` in a `finally` is only correct while
   *    one write exists at a time. Two overlapping writes (a debounced quantity
   *    landing while `remove` is in flight, which the per-product debounce makes
   *    ordinary rather than exotic) would have the first to finish clear the flag
   *    while the second is still running, re-enabling checkout mid-sync.
   * 2. Scheduling. `syncing` now goes true when a debounce timer is *scheduled*,
   *    not when it fires, so the flag has an owner during a window in which no
   *    promise exists at all. Cancelling that timer has to give the slot back —
   *    see `cancelQuantityTimer` — or the flag sticks true forever with nothing
   *    in flight and checkout is disabled for the rest of the session.
   */
  let pendingWrites = 0;

  function beginWrite() {
    pendingWrites += 1;
    set({ syncing: true });
  }

  function endWrite() {
    pendingWrites = Math.max(0, pendingWrites - 1);
    if (pendingWrites === 0) set({ syncing: false });
  }

  /** Run a server action, reconciling state from its response. Assumes the
   * caller already owns a `pendingWrites` slot and releases it.
   *
   * On failure the local optimistic state is deliberately LEFT ALONE rather
   * than rolled back: a network blip shouldn't yank items out from under
   * someone mid-edit, and the next successful call re-syncs everything anyway.
   * Checkout re-reads the cart server-side regardless, so a stale client can
   * never turn into a wrong charge. */
  async function reconcile(run: () => Promise<CartView>) {
    try {
      const view = await run();
      set({ lines: view.lines, ...totals(view.lines), loaded: true });
    } catch {
      // Swallowed on purpose — see above.
    } finally {
      endWrite();
    }
  }

  /** The immediate case: claim a slot and write now. */
  async function sync(run: () => Promise<CartView>) {
    beginWrite();
    await reconcile(run);
  }

  /** Drop a scheduled quantity write, returning its `pendingWrites` slot.
   *
   * Both `remove` and `clear` cancel timers, and every cancellation path must
   * come through here. A cancelled timer's slot was claimed at schedule time and
   * will never be claimed by a firing write, so nothing else will ever release
   * it. A no-op when there is no timer, so it can never release a slot it does
   * not own. */
  function cancelQuantityTimer(productId: string) {
    const timer = pendingQuantityTimers.get(productId);
    if (!timer) return;
    clearTimeout(timer);
    pendingQuantityTimers.delete(productId);
    endWrite();
  }

  return {
    lines: [],
    subtotalCents: 0,
    count: 0,
    syncing: false,
    loaded: false,

    hydrate: (view) => set({ lines: view.lines, ...totals(view.lines), loaded: true }),

    refresh: () => sync(() => getCart()),

    importLegacy: async () => {
      // Key used by the pre-database CartProvider.
      const LEGACY_KEY = "crochette-cart";

      let legacy: unknown;
      try {
        const raw = window.localStorage.getItem(LEGACY_KEY);
        if (!raw) return;
        legacy = JSON.parse(raw);
      } catch {
        // Corrupt or unavailable storage — nothing recoverable, and the key is
        // removed below so this can't retry forever.
        try {
          window.localStorage.removeItem(LEGACY_KEY);
        } catch {}
        return;
      }

      const items = Array.isArray(legacy)
        ? legacy
            .filter(
              (i): i is { productId: string; quantity: number } =>
                typeof i?.productId === "string" && Number.isFinite(Number(i?.quantity)),
            )
            .map((i) => ({ productId: i.productId, quantity: Number(i.quantity) }))
        : [];

      // Remove the key BEFORE the network call, not after. If the import fails
      // or the tab closes mid-flight, retrying on next load risks importing
      // twice and doubling quantities; losing an already-abandoned localStorage
      // cart is the cheaper failure.
      try {
        window.localStorage.removeItem(LEGACY_KEY);
      } catch {}

      if (items.length === 0) return;
      await sync(() => importLegacyCart(items));
    },

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

    setQuantity: (productId, quantity) => {
      const lines =
        quantity <= 0
          ? get().lines.filter((l) => l.productId !== productId)
          : get().lines.map((l) =>
              l.productId === productId
                ? { ...l, quantity: Math.min(quantity, Math.max(0, l.stockQty)) }
                : l,
            );
      set({ lines, ...totals(lines) });

      // Claimed here, at schedule time, not when the timer fires. For the whole
      // 400ms debounce window the server has not been told the new quantity, and
      // a `syncing` that reads false across it is simply wrong about that.
      //
      // Two honest limits on why this was worth doing. Nothing reads `syncing`
      // today (see its declaration), so no current behaviour changes — this
      // makes the field true for whoever reads it first. And even once something
      // does, the exposure is a stale view and never a wrong charge: checkout
      // re-reads and re-prices the cart server-side, the same property the
      // no-rollback decision above leans on. Do not escalate it.
      //
      // A superseded timer hands its slot to its replacement rather than
      // releasing and re-claiming, so a held-down stepper stays at exactly one
      // outstanding write per product.
      const existing = pendingQuantityTimers.get(productId);
      if (existing) clearTimeout(existing);
      else beginWrite();

      pendingQuantityTimers.set(
        productId,
        setTimeout(() => {
          // Deleted before the write starts, so `remove` arriving mid-flight
          // finds no timer and does not release a slot `reconcile` now owns.
          pendingQuantityTimers.delete(productId);
          void reconcile(() => setCartItemQuantity(productId, quantity));
        }, QUANTITY_DEBOUNCE_MS),
      );
    },

    remove: async (productId) => {
      // A pending debounced quantity write would otherwise land after the
      // delete and resurrect the row.
      cancelQuantityTimer(productId);

      const lines = get().lines.filter((l) => l.productId !== productId);
      set({ lines, ...totals(lines) });

      await sync(() => removeFromCart(productId));
    },

    clear: async () => {
      // Snapshot the keys first: cancelQuantityTimer mutates the map.
      for (const productId of [...pendingQuantityTimers.keys()]) cancelQuantityTimer(productId);

      set({ lines: [], subtotalCents: 0, count: 0 });
      await sync(() => emptyCart());
    },
  };
});
