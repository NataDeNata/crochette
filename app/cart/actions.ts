"use server";

import {
  addItem,
  clearCart,
  getCartView,
  removeItem,
  setItemQuantity,
  type CartView,
} from "@/lib/db/cart";
import { resolveCartId } from "@/lib/cart/resolve";

/**
 * Server Actions backing the cart.
 *
 * Every mutation returns the AUTHORITATIVE cart rather than void. The client
 * store applies an optimistic update first for responsiveness, then replaces
 * its state with whatever comes back — so a price change, a stock drop, or a
 * product being drafted in /admin self-corrects on the next interaction
 * instead of leaving the shopper on stale data until reload.
 */

const EMPTY: CartView = { cartId: "", lines: [], subtotalCents: 0, count: 0 };

/** Read-only. Safe to call during render — never creates a cart or sets a cookie. */
export async function getCart(): Promise<CartView> {
  const cartId = await resolveCartId({ create: false });
  return cartId ? getCartView(cartId) : EMPTY;
}

export async function addToCart(productId: string, quantity: number): Promise<CartView> {
  const cartId = await resolveCartId({ create: true });
  if (!cartId) return EMPTY;
  await addItem(cartId, productId, quantity);
  return getCartView(cartId);
}

export async function setCartItemQuantity(productId: string, quantity: number): Promise<CartView> {
  const cartId = await resolveCartId({ create: false });
  if (!cartId) return EMPTY;
  await setItemQuantity(cartId, productId, quantity);
  return getCartView(cartId);
}

export async function removeFromCart(productId: string): Promise<CartView> {
  const cartId = await resolveCartId({ create: false });
  if (!cartId) return EMPTY;
  await removeItem(cartId, productId);
  return getCartView(cartId);
}

/**
 * One-time import of a cart left in localStorage by the pre-database version.
 *
 * Without this, anyone mid-shop at deploy time silently loses their cart: the
 * server has never heard of it and the client stops reading the old key. Runs
 * once per browser, from CartProvider, which clears the key afterwards.
 *
 * Only product ids and quantities are accepted. The old localStorage payload
 * also carried name/price/stock, and all of it is ignored on purpose — it is
 * attacker-controllable and, more mundanely, likely stale. `addItem` re-reads
 * the real product and clamps to real stock, so a doctored payload buys
 * nothing beyond a cart the shopper could have built by hand.
 */
export async function importLegacyCart(
  items: { productId: string; quantity: number }[],
): Promise<CartView> {
  if (!Array.isArray(items) || items.length === 0) return getCart();

  const cartId = await resolveCartId({ create: true });
  if (!cartId) return EMPTY;

  // Capped so a corrupt or hostile payload can't turn one call into thousands
  // of round trips.
  for (const item of items.slice(0, 50)) {
    if (typeof item?.productId !== "string") continue;
    await addItem(cartId, item.productId, Number(item.quantity));
  }

  return getCartView(cartId);
}

export async function emptyCart(): Promise<CartView> {
  const cartId = await resolveCartId({ create: false });
  if (!cartId) return EMPTY;
  await clearCart(cartId);
  return getCartView(cartId);
}
