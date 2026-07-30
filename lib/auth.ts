import { cache } from "react";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google, { type GoogleProfile } from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { admins, customers } from "@/lib/db/schema";
import { lookupOrCreateGoogleCustomer } from "@/lib/db/accounts";
import { mergeCarts } from "@/lib/db/cart";
import { readCartCookie, setCartCookie } from "@/lib/cart/cookie";
import { logError, logInfo } from "@/lib/observability/log";
import { DUMMY_PASSWORD_HASH, hasPasswordChangedSince, isAbsoluteSessionExpired } from "@/lib/auth-session";
import { getClientIp, isRateLimited } from "@/lib/security/rate-limit";

/**
 * Rate limit applied inside `authorize` rather than only in the login Server
 * Actions, for the same reason cart-merge lives in `events.signIn`: no entry
 * point can forget it.
 *
 * The Server Actions' own limits are the ones a shopper actually meets — they
 * can return "Too many attempts" instead of a generic failure — but they only
 * guard the form. `POST /api/auth/callback/admin` is public and reaches this
 * code directly, so without this a caller skips the form and gets unlimited
 * bcrypt attempts.
 *
 * Returns true when the attempt should be refused. Fails **open** on an
 * Upstash outage: a rate limiter that can't be reached must not become an
 * outage of its own, and the credentials check behind it is still correct.
 */
async function authEndpointLimited(): Promise<boolean> {
  try {
    return await isRateLimited("auth-endpoint", await getClientIp());
  } catch (err) {
    logError("auth.rate_limit_unavailable", err, { detail: "credentials attempt allowed through" });
    return false;
  }
}

export const { handlers, auth: uncachedAuth, signIn, signOut } = NextAuth({
  // 30 days is Auth.js's own default — stated explicitly so it reads as a
  // decision. Admins are additionally capped at 8h absolute; see
  // lib/auth-session.ts and the jwt callback below.
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  // Custom login UIs (app/admin/login, app/account/login) call signIn()
  // directly — this just keeps NextAuth's own multi-provider default page
  // off the public GET /api/auth/signin route (proxy.ts's matcher doesn't
  // cover /api/auth/*, so without this the built-in page is reachable and
  // lists both the "admin" and "customer" provider ids).
  pages: {
    signIn: "/admin/login",
    // `error` defaults to the signIn page above, which would land a customer
    // whose Google sign-in failed on the *admin* login screen. Only customers
    // reach OAuth, so this is the right destination for anything that fails.
    error: "/account/login",
  },
  providers: [
    /**
     * Customer sign-in only. `/admin` stays Credentials-only and deliberately
     * gains no OAuth path — it is the account that can read every customer's
     * name, email, phone and address, and there is no reason to widen how it
     * can be reached.
     */
    Google({
      /**
       * Async on purpose: this is where the `customers` row is resolved.
       *
       * There is no adapter, so nothing persists the Google user for us — and
       * with `strategy: "jwt"`, whatever this returns *is* the `user` handed to
       * the jwt callback and to `events.signIn`. Returning Google's `sub` as
       * the id would put a non-uuid into `session.user.id`, and every later
       * `customer_id` write (orders, addresses, carts) would hand Postgres a
       * malformed uuid and raise 22P02 — the same failure class as the Xendit
       * `reference_id` bug, surfacing at checkout rather than at sign-in.
       * `events.signIn`'s cart merge reads the same id.
       *
       * So the DB write happens here, and our own uuid goes back.
       */
      async profile(profile: GoogleProfile) {
        // Enforced *here* rather than in the `signIn` callback, which is the
        // conventional spot: profile() runs first, so by the time signIn could
        // return false the row would already exist.
        if (profile.email_verified !== true) {
          throw new Error("Google account's email address is not verified");
        }

        const customer = await lookupOrCreateGoogleCustomer({
          email: profile.email,
          name: profile.name,
        });

        return {
          id: customer.id,
          email: customer.email,
          name: customer.name ?? customer.email,
          role: "customer" as const,
        };
      },
    }),
    Credentials({
      id: "admin",
      credentials: {
        email: { label: "Email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : undefined;
        const password = typeof credentials?.password === "string" ? credentials.password : undefined;
        if (!email || !password) return null;
        if (await authEndpointLimited()) return null;

        const [admin] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
        if (!admin) {
          // Spend the same ~250ms a real account would; result discarded.
          await compare(password, DUMMY_PASSWORD_HASH);
          return null;
        }

        const valid = await compare(password, admin.passwordHash);
        if (!valid) return null;

        return { id: admin.id, email: admin.email, name: admin.name ?? admin.email, role: "admin" as const };
      },
    }),
    Credentials({
      id: "customer",
      credentials: {
        email: { label: "Email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : undefined;
        const password = typeof credentials?.password === "string" ? credentials.password : undefined;
        if (!email || !password) return null;
        if (await authEndpointLimited()) return null;

        const [customer] = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
        // A null hash is a Google-only account (no password was ever set).
        // Treated identically to "no such account" — same dummy comparison,
        // same timing, same generic failure — so it can't be distinguished,
        // and `compare(password, null)` can never throw.
        if (!customer?.passwordHash) {
          // Spend the same ~250ms a real account would; result discarded.
          await compare(password, DUMMY_PASSWORD_HASH);
          return null;
        }

        const valid = await compare(password, customer.passwordHash);
        if (!valid) return null;

        return { id: customer.id, email: customer.email, name: customer.name ?? customer.email, role: "customer" as const };
      },
    }),
  ],
  callbacks: {
    /**
     * Runs at sign-in (with `user`) and on every subsequent session read.
     *
     * Returning `null` is the supported way to invalidate a session under the
     * JWT strategy: @auth/core's session handler pushes `sessionStore.clean()`
     * when this returns null, clearing the cookie. Both checks below are
     * admin-only — see lib/auth-session.ts for why customers are exempt.
     */
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        // Stamped at sign-in and never refreshed, unlike the cookie's own
        // expiry, which @auth/core rolls forward on every read. This is what
        // makes the admin cap an absolute one rather than an idle timeout.
        token.authTime = Date.now();
        return token;
      }

      if (isAbsoluteSessionExpired(token.role, token.authTime, Date.now())) {
        logInfo("auth.session_revoked", { reason: "absolute_expiry", role: token.role, userId: token.id });
        return null;
      }

      if (await hasPasswordChangedSince(token.role, token.id, token.authTime)) {
        logInfo("auth.session_revoked", { reason: "password_rotated", role: token.role, userId: token.id });
        return null;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.role) {
        session.user.role = token.role;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  events: {
    /**
     * Fold a guest's cart into their account on sign-in.
     *
     * Hooked here rather than in the two login actions because `events.signIn`
     * covers both the login and signup paths (app/account/login/actions.ts and
     * app/account/signup/actions.ts) from one place — a new entry point can't
     * forget to call it.
     *
     * Admins are skipped: /admin has no cart, and an admin signing in on a
     * machine that also shops would otherwise have the shopper's guest cart
     * silently attached to the admin account.
     *
     * Deliberately non-fatal. A failure here must never block a login — the
     * worst case is a guest cart that stays unclaimed, which the shopper can
     * recover by re-adding items, whereas a thrown error would lock them out of
     * their account entirely.
     */
    async signIn({ user }) {
      if (user?.role !== "customer" || !user.id) return;

      try {
        const guestCartId = await readCartCookie();
        const survivingCartId = await mergeCarts(guestCartId, user.id);
        if (survivingCartId !== guestCartId) await setCartCookie(survivingCartId);
      } catch (err) {
        logError("cart.merge_on_login_failed", err, {
          detail:
            "guest cart could not be merged into the customer's cart; the login itself succeeded and the guest cart is left intact",
        });
      }
    },
  },
});

// next-auth's own `auth()` isn't memoized per-request, so calling it from
// the root layout *and* a nested layout/page (as app/layout.tsx and
// app/account/* both do) independently re-parses the session cookie and
// re-verifies the JWT each time. Wrapping it in React's `cache()` collapses
// those into a single call per request.
export const auth = cache(uncachedAuth);
