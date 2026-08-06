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

/**
 * Thrown when a mutation cannot find the cart it was asked to change.
 *
 * This exists because the three mutators below used to `return EMPTY` in that
 * case, and EMPTY is a *successful* result meaning "your cart is empty". The
 * client store replaces its state wholesale with whatever a mutation returns
 * (see lib/cart/store.ts), so answering "couldn't resolve your cart" with an
 * empty cart made every remaining line vanish from the screen at once: remove
 * one item, watch the whole cart clear. The rows were still in the database the
 * entire time — a reload brought them all back — which is what made it read as
 * data loss rather than as a failed request.
 *
 * The two states are genuinely different and only one of them is news:
 *   - `getCart()` finding no cart really does mean the cart is empty. It is a
 *     read, nothing was asked for, and EMPTY is the honest answer. It stays.
 *   - A *mutation* finding no cart means the request could not be carried out.
 *     Reporting that as an empty cart asserts something false about the
 *     shopper's data.
 *
 * Throwing routes it into `sync()`'s catch, which deliberately leaves the
 * optimistic local state alone rather than rolling back — so the one item the
 * shopper removed goes, the rest stay on screen, and the next successful call
 * re-syncs everything. Checkout re-reads and re-prices the cart server-side
 * regardless, so a client that is briefly ahead of the server can never turn
 * into a wrong charge.
 *
 * Resolution fails more often than "never": a guest whose cart cookie expired
 * or was cleared, a guest whose cookie points at a cart an account has since
 * claimed (`isGuestCart` is false for it), or a signed-in customer whose
 * session lapsed while the cart page sat open in a tab. That last one needs no
 * unusual behaviour at all — leave the tab open long enough, click Remove, and
 * the cart appeared to empty itself.
 */
class CartUnavailableError extends Error {
  constructor() {
    super("No cart to mutate — resolution failed.");
    this.name = "CartUnavailableError";
  }
}

/** Read-only. Safe to call during render — never creates a cart or sets a cookie. */
export async function getCart(): Promise<CartView> {
  const cartId = await resolveCartId({ create: false });
  return cartId ? getCartView(cartId) : EMPTY;
}

export async function addToCart(productId: string, quantity: number): Promise<CartView> {
  const cartId = await resolveCartId({ create: true });
  if (!cartId) throw new CartUnavailableError();
  await addItem(cartId, productId, quantity);
  return getCartView(cartId);
}

export async function setCartItemQuantity(productId: string, quantity: number): Promise<CartView> {
  const cartId = await resolveCartId({ create: false });
  if (!cartId) throw new CartUnavailableError();
  await setItemQuantity(cartId, productId, quantity);
  return getCartView(cartId);
}

export async function removeFromCart(productId: string): Promise<CartView> {
  const cartId = await resolveCartId({ create: false });
  if (!cartId) throw new CartUnavailableError();
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
  // Throws for the same reason the mutators do, and it matters more here than
  // it looks: this runs once from CartProvider on startup, so returning EMPTY
  // would have replaced a correctly hydrated cart with nothing before the
  // shopper touched anything.
  if (!cartId) throw new CartUnavailableError();

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
  // The one mutator that keeps EMPTY, and it is not an oversight: the caller
  // asked for an empty cart, and having no cart at all satisfies that. Nothing
  // false is asserted and nothing is lost.
  if (!cartId) return EMPTY;
  await clearCart(cartId);
  return getCartView(cartId);
}
