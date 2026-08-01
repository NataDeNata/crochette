"use server";

import { signOut } from "@/lib/auth";
import { clearCartCookie } from "@/lib/cart/cookie";

export async function accountSignOut() {
  // Drop the cart cookie before the session goes.
  //
  // After a cart merge the cookie holds the *customer's* cart id, not a guest
  // one (lib/auth.ts). Left behind, it follows the browser into the next
  // person's session — on a shared device the next visitor was served, and
  // could check out with, this account's cart. Sign-out is the one moment that
  // identity is unambiguously finished with.
  await clearCartCookie();
  await signOut({ redirectTo: "/" });
}
