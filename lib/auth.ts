import { cache } from "react";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { admins, customers } from "@/lib/db/schema";

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
});

// next-auth's own `auth()` isn't memoized per-request, so calling it from
// the root layout *and* a nested layout/page (as app/layout.tsx and
// app/account/* both do) independently re-parses the session cookie and
// re-verifies the JWT each time. Wrapping it in React's `cache()` collapses
// those into a single call per request.
export const auth = cache(uncachedAuth);
