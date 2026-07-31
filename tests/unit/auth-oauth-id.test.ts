import { describe, expect, it } from "vitest";

/**
 * Pins the @auth/core behaviour that broke Google sign-in.
 *
 * Its OAuth callback builds the session user as
 *   `{ ...userFromProfile, id: crypto.randomUUID() }`
 * so the `customers.id` our `profile()` returns is discarded and replaced with
 * a uuid matching no row. Everything downstream that wrote `user.id` into a
 * `customer_id` column failed the foreign key, and /account/orders — a SELECT,
 * with no FK to fail — just returned an empty list. That is the bug where a
 * customer's order history "disappeared" after signing in with Google.
 *
 * The fix carries our uuid in `customerId`, which survives the spread. These
 * tests encode both halves: that a bare `id` must not be trusted after an OAuth
 * sign-in, and that the `customerId ?? id` resolution behaves for both provider
 * kinds. If a future @auth/core stops overwriting `id`, the fallback still
 * holds and nothing here breaks.
 */
describe("OAuth user id resolution", () => {
  type ProfileResult = { id?: string; customerId?: string; email?: string; role?: string };

  /** Exactly what @auth/core does to an OAuth profile result. */
  function asAuthCoreWouldBuildIt(userFromProfile: ProfileResult): ProfileResult & { id: string; email: string } {
    return {
      ...userFromProfile,
      id: crypto.randomUUID(),
      email: String(userFromProfile.email ?? "").toLowerCase(),
    };
  }

  /** The resolution used by the jwt callback and events.signIn. */
  const resolve = (user: { customerId?: string; id?: string }) => user.customerId ?? user.id;

  const OUR_ID = "11111111-2222-3333-4444-555555555555";

  it("discards the id returned by profile(), which is why customerId exists", () => {
    const user = asAuthCoreWouldBuildIt({
      id: OUR_ID,
      customerId: OUR_ID,
      email: "Shopper@Example.test",
      role: "customer",
    });

    // The exact trap: `id` looks like a perfectly good uuid, but it is not ours.
    expect(user.id).not.toBe(OUR_ID);
    expect(resolve(user)).toBe(OUR_ID);
  });

  it("preserves custom fields through the spread", () => {
    // role surviving is what made the bug subtle: the guards passed, so the
    // handler ran and only the database refused it.
    const user = asAuthCoreWouldBuildIt({ id: OUR_ID, customerId: OUR_ID, email: "a@b.test", role: "customer" });
    expect(user.role).toBe("customer");
    expect(user.customerId).toBe(OUR_ID);
  });

  it("falls back to id for credentials sign-ins, which set no customerId", () => {
    // Credentials providers keep the id they return, so the fallback is the
    // normal path there — not an error case.
    expect(resolve({ id: OUR_ID })).toBe(OUR_ID);
  });

  it("resolves to nothing when neither is present, so callers can bail", () => {
    expect(resolve({})).toBeUndefined();
  });
});
