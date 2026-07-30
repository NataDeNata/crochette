import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { hasPasswordChangedSince } from "@/lib/auth-session";
import { admins } from "@/lib/db/schema";
import { testDb } from "../helpers/db";
import { makeAdmin, makeCustomer } from "../helpers/factories";

/**
 * Password rotation as an actual session revocation.
 *
 * `npm run db:seed-admin` stamps `admins.password_changed_at`; lib/auth.ts's
 * jwt callback rejects any admin session issued before that instant. Before
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

  it("never queries for a customer session", async () => {
    // Scoped to admin deliberately: nothing writes customers.password_changed_at
    // yet, so checking it would cost every shopper a DB round-trip per request.
    // A customer id passed with role "customer" must short-circuit, not look up.
    const customer = await makeCustomer();
    expect(await hasPasswordChangedSince("customer", customer.id, 0)).toBe(false);
  });

  it("short-circuits on a missing id or authTime rather than throwing", async () => {
    const admin = await makeAdmin();
    await rotate(admin.id, new Date());
    expect(await hasPasswordChangedSince("admin", undefined, anHourAgo())).toBe(false);
    expect(await hasPasswordChangedSince("admin", admin.id, undefined)).toBe(false);
  });
});
