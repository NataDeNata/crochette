import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { hasPasswordChangedSince } from "@/lib/auth-session";
import { admins, customers } from "@/lib/db/schema";
import { testDb } from "../helpers/db";
import { makeAdmin, makeCustomer } from "../helpers/factories";

/**
 * Password rotation as an actual session revocation.
 *
 * `npm run db:seed-admin` stamps `admins.password_changed_at` and
 * `setCustomerPassword` stamps `customers.password_changed_at`; lib/auth.ts's
 * jwt callback rejects any session issued before that instant. Before
 * this, rotating the password only affected the *next* login — a stolen token
 * stayed valid for its full 30 days with no way to kill it.
 *
 * Asserted in both directions, the shape §9 argues for: a rotation must revoke,
 * and an untouched account must **not** be revoked, or the studio owner is
 * signed out on every request.
 */
describe("hasPasswordChangedSince", () => {
  const anHourAgo = () => Date.now() - 60 * 60 * 1000;

  async function rotate(adminId: string, at: Date) {
    await testDb.update(admins).set({ passwordChangedAt: at }).where(eq(admins.id, adminId));
  }

  async function rotateCustomer(customerId: string, at: Date) {
    await testDb.update(customers).set({ passwordChangedAt: at }).where(eq(customers.id, customerId));
  }

  it("does not revoke an account whose password was never rotated", async () => {
    const admin = await makeAdmin();
    expect(await hasPasswordChangedSince("admin", admin.id, anHourAgo())).toBe(false);
  });

  it("revokes a session issued before the rotation", async () => {
    const admin = await makeAdmin();
    await rotate(admin.id, new Date());
    expect(await hasPasswordChangedSince("admin", admin.id, anHourAgo())).toBe(true);
  });

  it("leaves a session issued after the rotation alone", async () => {
    // The sign-in that immediately follows a password change must survive, or
    // rotating the password would lock the owner out permanently.
    const admin = await makeAdmin();
    await rotate(admin.id, new Date(Date.now() - 60 * 60 * 1000));
    expect(await hasPasswordChangedSince("admin", admin.id, Date.now())).toBe(false);
  });

  /**
   * Customers, since Stage B.
   *
   * This block replaces a test called "never queries for a customer session",
   * which pinned the old short-circuit. That behaviour was right for as long as
   * nothing wrote `customers.password_changed_at` — paying a round-trip per
   * request to read a column that is always null is not a trade — and wrong the
   * moment password reset started writing it, because a reset that leaves the
   * attacker's other sessions alive fails the expectation the feature exists to
   * meet. The old test is recorded here rather than silently deleted: it did
   * not fail on its own when the behaviour flipped, since an unrotated customer
   * returns false either way, so nothing but this note marks the change.
   */
  it("revokes a customer session issued before a password reset", async () => {
    const customer = await makeCustomer();
    await rotateCustomer(customer.id, new Date());
    expect(await hasPasswordChangedSince("customer", customer.id, anHourAgo())).toBe(true);
  });

  it("leaves the sign-in that follows a customer's own reset alone", async () => {
    // completePasswordReset signs the shopper straight in afterwards, so this
    // is the session that must survive the revocation the reset just caused.
    const customer = await makeCustomer();
    await rotateCustomer(customer.id, new Date(Date.now() - 60 * 60 * 1000));
    expect(await hasPasswordChangedSince("customer", customer.id, Date.now())).toBe(false);
  });

  it("does not revoke a customer who has never reset a password", async () => {
    // The overwhelmingly common case — every account starts here, and a false
    // positive would sign out every shopper on the site.
    const customer = await makeCustomer();
    expect(await hasPasswordChangedSince("customer", customer.id, anHourAgo())).toBe(false);
  });

  it("short-circuits on a missing id or authTime rather than throwing", async () => {
    const admin = await makeAdmin();
    await rotate(admin.id, new Date());
    expect(await hasPasswordChangedSince("admin", undefined, anHourAgo())).toBe(false);
    expect(await hasPasswordChangedSince("admin", admin.id, undefined)).toBe(false);
  });
});
