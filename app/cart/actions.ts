"use server";

import { auth } from "@/lib/auth";
import {
  addItem,
  cartExists,
  clearCart,
  createGuestCart,
  getCartView,
  getOrCreateCustomerCart,
  removeItem,
  setItemQuantity,
  type CartView,
} from "@/lib/db/cart";
import { readCartCookie, setCartCookie } from "@/lib/cart/cookie";

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
 * Which cart this request belongs to.
 *
 * A signed-in customer is always addressed by customer id, never by the cookie
 * — otherwise two devices would disagree about the same account's cart. The
 * cookie is only ever the guest path.
 *
 * `create: false` is the read path: it must not mint a cart (or set a cookie)
 * merely because someone loaded a page, or every crawler hit would leave a row
 * behind. Reads on a visitor with no cart return null and render as empty.
 */
async function resolveCartId({ create }: { create: boolean }): Promise<string | null> {
  const session = await auth();
  const customerId = session?.user?.role === "customer" ? session.user.id : null;

  if (customerId) {
    if (create) return getOrCreateCustomerCart(customerId);
    const existing = await readCartCookie();
    // A logged-in customer with no cart yet reads as empty rather than having
    // one created for them by a page view.
    return existing && (await cartExists(existing)) ? existing : null;
  }

  const fromCookie = await readCartCookie();
  if (fromCookie && (await cartExists(fromCookie))) return fromCookie;

  if (!create) return null;

  // First add-to-cart by a guest: this is the "start anonymous" moment.
  const cartId = await createGuestCart();
  await setCartCookie(cartId);
  return cartId;
}

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

export async function emptyCart(): Promise<CartView> {
  const cartId = await resolveCartId({ create: false });
  if (!cartId) return EMPTY;
  await clearCart(cartId);
  return getCartView(cartId);
}
