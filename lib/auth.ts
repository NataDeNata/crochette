import { cache } from "react";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { admins, customers } from "@/lib/db/schema";
import { mergeCarts } from "@/lib/db/cart";
import { readCartCookie, setCartCookie } from "@/lib/cart/cookie";
import { logError } from "@/lib/observability/log";

export const { handlers, auth: uncachedAuth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  // Custom login UIs (app/admin/login, app/account/login) call signIn()
  // directly — this just keeps NextAuth's own multi-provider default page
  // off the public GET /api/auth/signin route (proxy.ts's matcher doesn't
  // cover /api/auth/*, so without this the built-in page is reachable and
  // lists both the "admin" and "customer" provider ids).
  pages: { signIn: "/admin/login" },
  providers: [
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

        const [admin] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
        if (!admin) return null;

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

        const [customer] = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
        if (!customer) return null;

        const valid = await compare(password, customer.passwordHash);
        if (!valid) return null;

        return { id: customer.id, email: customer.email, name: customer.name ?? customer.email, role: "customer" as const };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
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
