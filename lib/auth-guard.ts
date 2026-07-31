import { auth } from "@/lib/auth";

/**
 * Assert the caller is a signed-in admin, and hand back their id.
 *
 * `proxy.ts` already redirects any non-admin away from `/admin/*`, and a Server
 * Action POSTs to the route it was rendered from — so in practice this is a
 * second lock on a door that is already locked. It exists because that
 * reasoning is indirect and depends on the proxy matcher never being narrowed:
 * Next's own guidance is that Server Functions are reachable by direct POST and
 * must check authorization themselves
 * (node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md).
 *
 * Throws rather than returning null. Every call site is an action that a
 * legitimate admin always passes, so there is no sensible in-form error to
 * render — reaching the failure branch means something skipped the front door.
 * `auth()` is React-`cache()`d (lib/auth.ts), so calling this costs nothing
 * beyond the session read the surrounding page already did.
 */
export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const session = await auth();
  if (session?.user?.role !== "admin" || !session.user.id) {
    throw new Error("Unauthorized");
  }
  return { id: session.user.id, email: session.user.email ?? "" };
}
