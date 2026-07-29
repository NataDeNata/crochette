import "server-only";
import { auth } from "@/lib/auth";
import { cartExists, createGuestCart, getOrCreateCustomerCart } from "@/lib/db/cart";
import { readCartCookie, setCartCookie } from "./cookie";

/**
 * Which cart the current request belongs to.
 *
 * Lives here rather than in app/cart/actions.ts because that file is
 * `"use server"`, where every export becomes a callable Server Action — this is
 * an internal helper and shouldn't be one. Checkout needs it too.
 *
 * A signed-in customer is always addressed by customer id, never by the cookie,
 * or two devices would disagree about the same account's cart.
 *
 * `create: false` is the read path: it must not mint a cart (or set a cookie)
 * merely because someone loaded a page, or every crawler hit would leave a row
 * behind. It is also the only form safe to call during render, since Next
 * forbids setting cookies there.
 */
export async function resolveCartId({ create }: { create: boolean }): Promise<string | null> {
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

  // First add-to-cart by a guest: the "start anonymous" moment.
  const cartId = await createGuestCart();
  await setCartCookie(cartId);
  return cartId;
}
