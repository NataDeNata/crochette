import "server-only";
import { currentCustomerId } from "@/lib/auth-guard";
import { createGuestCart, findCustomerCart, getOrCreateCustomerCart, isGuestCart } from "@/lib/db/cart";
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
  const customerId = await currentCustomerId();

  if (customerId) {
    if (create) return getOrCreateCustomerCart(customerId);
    // Addressed by customer id, never by the cookie — which is what the note
    // above always claimed, but the read path used to consult the cookie and
    // only check that the cart *existed*. On a shared browser the cookie can
    // still hold the previous customer's cart id (lib/auth.ts writes it there
    // after a merge, and it was never cleared on sign-out), so this path served
    // — and checkout bought — another account's cart.
    //
    // A logged-in customer with no cart yet reads as empty rather than having
    // one created for them by a page view.
    return findCustomerCart(customerId);
  }

  // Guests must present a cookie naming a cart that is still unclaimed. A
  // cookie pointing at some account's cart is treated as no cart at all.
  const fromCookie = await readCartCookie();
  if (fromCookie && (await isGuestCart(fromCookie))) return fromCookie;

  if (!create) return null;

  // First add-to-cart by a guest: the "start anonymous" moment.
  const cartId = await createGuestCart();
  await setCartCookie(cartId);
  return cartId;
}
