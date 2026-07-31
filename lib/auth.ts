import { cache } from "react";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google, { type GoogleProfile } from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { admins, customers } from "@/lib/db/schema";
import { claimGuestOrders, lookupOrCreateGoogleCustomer } from "@/lib/db/accounts";
import { verifyAdminSecondFactor } from "@/lib/db/admin-account";
import { verifyAdminChallenge } from "@/lib/security/admin-challenge";
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

type AdminRecord = { id: string; email: string; name: string | null; totpConfirmedAt: Date | null };

/** The login form's path: the password was already checked by the Server
 * Action, and this token is the proof. Nothing is re-hashed here. */
async function adminFromChallenge(challenge: string): Promise<AdminRecord | null> {
  const adminId = verifyAdminChallenge(challenge);
  if (!adminId) return null;

  const [admin] = await db
    .select({ id: admins.id, email: admins.email, name: admins.name, totpConfirmedAt: admins.totpConfirmedAt })
    .from(admins)
    .where(eq(admins.id, adminId))
    .limit(1);

  return admin ?? null;
}

/** The direct-POST path. Kept working rather than removed, so that
 * `/api/auth/callback/admin` behaves like a credentials endpoint should
 * (constant-time, rate-limited) instead of failing in a way that itself
 * distinguishes accounts — but it can never satisfy an enrolled second factor,
 * because it carries no code. */
async function adminFromPassword(
  rawEmail: unknown,
  rawPassword: unknown
): Promise<AdminRecord | null> {
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : undefined;
  const password = typeof rawPassword === "string" ? rawPassword : undefined;
  if (!email || !password) return null;

  const [admin] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
  if (!admin) {
    // Spend the same ~250ms a real account would; result discarded.
    await compare(password, DUMMY_PASSWORD_HASH);
    return null;
  }

  const valid = await compare(password, admin.passwordHash);
  if (!valid) return null;

  return { id: admin.id, email: admin.email, name: admin.name, totpConfirmedAt: admin.totpConfirmedAt };
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
       * There is no adapter, so nothing persists the Google user for us. With
       * `strategy: "jwt"`, what this returns is *nearly* the `user` handed to
       * the jwt callback and `events.signIn` — with one exception that matters
       * more than anything else here.
       *
       * **@auth/core overwrites `id`.** Its OAuth callback builds the user as
       * `{ ...userFromProfile, id: crypto.randomUUID(), email: ... }`
       * (lib/actions/callback/oauth/callback.js). The spread preserves custom
       * fields — that is why `role` arrives intact — but `id` is replaced
       * unconditionally, so our uuid never survives in `user.id`.
       *
       * The consequence was live for a while and easy to miss: `session.user.id`
       * pointed at no customer row, so every `customer_id` write (carts, orders,
       * addresses) failed `orders_customer_id_customers_id_fk`, and
       * /account/orders — a plain SELECT, no FK to violate — simply returned
       * nothing. A customer with orders saw an empty history.
       *
       * So the DB write happens here and our uuid goes back in `customerId`,
       * which @auth/core does not touch. The jwt callback and events.signIn
       * both read that in preference to `id`. See lib/auth-types.ts.
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
          // Set for completeness, but @auth/core throws this away: its OAuth
          // callback builds the user as `{ ...userFromProfile, id:
          // crypto.randomUUID() }`, so `id` is always replaced with a random
          // uuid that matches no customers row. Hence customerId below.
          id: customer.id,
          // The id that actually survives. The spread above preserves unknown
          // fields — the same mechanism `role` relies on — so this is how our
          // uuid reaches the jwt callback and events.signIn. Without it every
          // customer_id write (orders, carts, addresses) fails the foreign key.
          customerId: customer.id,
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
        /** Set instead of email/password by app/admin/login/actions.ts, which
         * has already verified the password. See lib/security/admin-challenge.ts. */
        challenge: { label: "Login challenge" },
        totp: { label: "Authentication code" },
      },
      /**
       * Two ways in, and the second factor is enforced on **both** — that is
       * the entire security argument for this function.
       *
       * The login form takes the challenge path: step one checks the password
       * and mints a signed token, step two adds the code. But
       * `POST /api/auth/callback/admin` is public (proxy.ts matches only
       * `/admin/*` and `/account/*`), so the email/password path below stays
       * directly reachable by anyone — which is precisely how every rate limit
       * in this project turned out to be skippable on 2026-07-30. A 2FA check
       * that lived only in the Server Action would have exactly the same hole,
       * and it would be a worse one: it would look enabled in the UI while
       * being one POST away from irrelevant.
       *
       * So enrolment is checked here, against the database, on the way to
       * returning a user. Neither path can reach the `return` without it.
       */
      async authorize(credentials) {
        if (await authEndpointLimited()) return null;

        const challenge = typeof credentials?.challenge === "string" ? credentials.challenge : undefined;
        const totp = typeof credentials?.totp === "string" ? credentials.totp : "";

        const admin = challenge
          ? await adminFromChallenge(challenge)
          : await adminFromPassword(credentials?.email, credentials?.password);

        if (!admin) return null;

        // The gate. A confirmed enrolment means no sign-in happens without a
        // code, whichever path got here — including the password path, which
        // carries no code at all and therefore always fails this once 2FA is
        // on. That is deliberate: the direct-POST route must not be a way to
        // sign in with a single factor.
        if (admin.totpConfirmedAt && !(await verifyAdminSecondFactor(admin.id, totp))) {
          logInfo("auth.admin.second_factor_rejected", { adminId: admin.id, via: challenge ? "challenge" : "password" });
          return null;
        }

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
        // `customerId` first: on an OAuth sign-in `user.id` is a random uuid
        // @auth/core generated, not ours (see lib/auth-types.ts). Credentials
        // sign-ins don't set customerId and keep their own id, so the fallback
        // is the normal path for those.
        token.id = user.customerId ?? user.id;
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
     * Fold a guest's cart — and their past guest orders — into their account
     * on sign-in.
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
     * Both steps are deliberately non-fatal, and independently so. A failure
     * here must never block a login — the worst case is a guest cart or order
     * that stays unclaimed, whereas a thrown error would lock the customer out
     * of their account entirely.
     */
    async signIn({ user, account }) {
      // Same substitution as the jwt callback: `user.id` is a random uuid on
      // an OAuth sign-in, so writing it into carts/orders fails the foreign
      // key. This is what silently broke the Google cart merge — the failure
      // is non-fatal by design, so it only ever showed up as a log line.
      const customerId = user?.customerId ?? user?.id;
      if (user?.role !== "customer" || !customerId) return;

      /**
       * Google only, and the gate is the whole security argument.
       *
       * claimGuestOrders matches on email, so it must only run where the email
       * has been proven to belong to whoever is signing in. Google asserts
       * `email_verified` and the profile() callback above hard-rejects anything
       * else. Credentials sign-ins are excluded because nothing verifies a
       * password account's address yet — until email verification ships,
       * including them would let anyone sign up with someone else's address and
       * read the name, phone and shipping address off that person's orders.
       *
       * When email verification lands, widening this to `customer` sign-ins
       * whose address is verified is the only change needed.
       */
      if (account?.provider === "google" && user.email) {
        try {
          const claimed = await claimGuestOrders(customerId, user.email);
          if (claimed > 0) {
            logInfo("orders.guest_claimed", { customerId, count: claimed });
          }
        } catch (err) {
          logError("orders.guest_claim_failed", err, {
            detail:
              "past guest orders could not be attached to the account; the sign-in itself succeeded and the orders are untouched",
          });
        }
      }

      try {
        const guestCartId = await readCartCookie();
        const survivingCartId = await mergeCarts(guestCartId, customerId);
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
