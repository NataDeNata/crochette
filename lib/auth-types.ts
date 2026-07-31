// next-auth v5 re-exports its User/Session/JWT types from @auth/core rather
// than declaring its own — augmenting "next-auth"/"next-auth/jwt" directly
// doesn't merge into anything, so these target the actual source modules.
// A plain .ts file (not .d.ts) — this project's tsconfig `include` glob
// doesn't pick up root/lib .d.ts files, only next-env.d.ts (explicitly
// listed) and generated .next/**/*.d.ts.
import type { DefaultSession } from "@auth/core/types";

export type UserRole = "admin" | "customer";

declare module "@auth/core/types" {
  interface User {
    role: UserRole;
    /**
     * Our `customers.id`, carried separately because `user.id` cannot survive
     * an OAuth sign-in.
     *
     * @auth/core's OAuth callback builds the user as
     * `{ ...userFromProfile, id: crypto.randomUUID() }`
     * (lib/actions/callback/oauth/callback.js) — the spread keeps every custom
     * field, which is why `role` works, but `id` is unconditionally replaced
     * with a fresh random uuid. Anything written from `user.id` therefore
     * points at no customer row at all and fails the FK.
     *
     * Credentials providers keep the id they return, so this is only ever set
     * by the Google provider; readers fall back to `user.id`.
     */
    customerId?: string;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    /** Epoch ms at sign-in. Fixed for the life of the session — the cookie's
     * own expiry is rolled forward on every read, so it can't measure age.
     * See lib/auth-session.ts. */
    authTime?: number;
  }
}
