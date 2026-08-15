import { redirect } from "next/navigation";
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
  const admin = await adminOrNull();
  if (!admin) throw new Error("Unauthorized");
  return admin;
}

/**
 * The same assertion for a *page* render rather than an action.
 *
 * `requireAdmin`'s throw is right for an action — nothing sensible to render,
 * and reaching it means the front door was skipped. During a page render it is
 * wrong: a session expiring between the proxy check and the render is ordinary,
 * and it would show a generic 500 instead of sending the admin to sign in. The
 * split keeps each failure mode matched to its caller.
 */
export async function requireAdminPage(): Promise<{ id: string; email: string }> {
  const admin = await adminOrNull();
  if (!admin) redirect("/admin/login");
  return admin;
}

/**
 * The signed-in shopper's id, or null for a guest — or for an admin, who is
 * signed in but owns no cart, no addresses and no orders.
 *
 * Null rather than a redirect: every caller has a sensible guest path, which is
 * the opposite of the admin guards above.
 */
export async function currentCustomerId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.role === "customer" ? session.user.id : null;
}

async function adminOrNull(): Promise<{ id: string; email: string } | null> {
  const session = await auth();
  if (session?.user?.role !== "admin" || !session.user.id) return null;
  return { id: session.user.id, email: session.user.email ?? "" };
}
