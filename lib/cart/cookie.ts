import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * The anonymous cart identity: an httpOnly cookie holding a cart id.
 *
 * This is what replaces Supabase Auth's `signInAnonymously()`. A guest's
 * identity is nothing more than "which cart row is yours", which is not a
 * security boundary — checkout re-fetches every price from the database and
 * recomputes the total server-side, so possession of a cart id grants nothing
 * beyond seeing some yarn.
 *
 * The value is still HMAC-signed. Guessing a v4 uuid isn't feasible, so the
 * signature isn't preventing enumeration; it makes tampering *detectable*, so a
 * malformed cookie is discarded cleanly instead of being fed to Postgres as a
 * uuid and raising 22P02 the way a malformed webhook reference_id did.
 */
const COOKIE_NAME = "crochette_cart";

/** 60 days. Long enough that a guest's cart survives a browsing break, short
 * enough that abandoned guest carts age out of the table on their own. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 60;

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    // Same lazy contract as lib/db/index.ts: fail loudly when actually used,
    // rather than at import time, so the app still builds without secrets set.
    throw new Error("AUTH_SECRET is not set — required to sign the cart cookie.");
  }
  return value;
}

function sign(cartId: string): string {
  return createHmac("sha256", secret()).update(cartId).digest("base64url");
}

/** Constant-time compare. Both sides are base64url of a fixed-length digest, so
 * a length mismatch means "forged" and can short-circuit safely. */
function signatureMatches(cartId: string, signature: string): boolean {
  const expected = Buffer.from(sign(cartId));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** Reads and verifies the cart cookie. Returns null for absent, malformed, or
 * tampered values — every failure mode collapses to "this visitor has no cart
 * yet", which callers already handle. */
export async function readCartCookie(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const separator = raw.lastIndexOf(".");
  if (separator <= 0) return null;

  const cartId = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);
  if (!cartId || !signature) return null;

  try {
    return signatureMatches(cartId, signature) ? cartId : null;
  } catch {
    // Missing AUTH_SECRET shouldn't take down a page render over a cart cookie.
    return null;
  }
}

/**
 * NOTE: only callable from a Server Action or Route Handler. Next.js forbids
 * setting cookies during render, which is exactly why the cart row is created
 * on the first add-to-cart rather than on first page view.
 */
export async function setCartCookie(cartId: string): Promise<void> {
  (await cookies()).set(COOKIE_NAME, `${cartId}.${sign(cartId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearCartCookie(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
