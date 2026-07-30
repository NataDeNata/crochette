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
