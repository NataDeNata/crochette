import { compare } from "bcryptjs";
import { describe, expect, it } from "vitest";
import { ADMIN_SESSION_MAX_AGE_MS, DUMMY_PASSWORD_HASH, isAbsoluteSessionExpired } from "@/lib/auth-session";

/**
 * The constant-time login fix is only as good as this constant. A truncated or
 * hand-edited value would make `compare` reject early, quietly restoring the
 * timing oracle it exists to close — and nothing else in the app would fail.
 */
describe("DUMMY_PASSWORD_HASH", () => {
  it("is a bcrypt hash at the same cost factor as the stored ones", () => {
    expect(DUMMY_PASSWORD_HASH).toMatch(/^\$2[aby]\$12\$[./A-Za-z0-9]{53}$/);
  });

  it("costs a real comparison rather than failing fast", async () => {
    const started = performance.now();
    await expect(compare("not the password", DUMMY_PASSWORD_HASH)).resolves.toBe(false);
    // A malformed hash rejects in microseconds. Cost 12 is ~250ms; the floor is
    // set well under that so a slow CI runner can't make this flaky.
    expect(performance.now() - started).toBeGreaterThan(50);
  });
});

/**
 * The absolute admin session cap.
 *
 * "Absolute" is the whole point: @auth/core re-signs the session cookie with a
 * fresh expiry on every read, so an admin who keeps using the back office would
 * never be signed out by `session.maxAge` alone. These cases pin the boundary
 * and, just as importantly, pin who is *exempt* — a regression that started
 * expiring customer sessions at 8 hours would be a visible outage for shoppers.
 */
describe("isAbsoluteSessionExpired", () => {
  const now = 1_800_000_000_000;
  const signedInAt = (agoMs: number) => now - agoMs;

  it("caps admin sessions at 8 hours", () => {
    expect(ADMIN_SESSION_MAX_AGE_MS).toBe(8 * 60 * 60 * 1000);
  });

  it("expires an admin session at exactly the cap", () => {
    expect(isAbsoluteSessionExpired("admin", signedInAt(ADMIN_SESSION_MAX_AGE_MS), now)).toBe(true);
  });

  it("keeps an admin session one second under the cap", () => {
    expect(isAbsoluteSessionExpired("admin", signedInAt(ADMIN_SESSION_MAX_AGE_MS - 1000), now)).toBe(false);
  });

  it("expires an admin session well past the cap", () => {
    expect(isAbsoluteSessionExpired("admin", signedInAt(30 * 24 * 60 * 60 * 1000), now)).toBe(true);
  });

  it.each([0, 1, 8, 24, 24 * 30])("never expires a customer session at %i hours old", (hours) => {
    expect(isAbsoluteSessionExpired("customer", signedInAt(hours * 60 * 60 * 1000), now)).toBe(false);
  });

  it("leaves a token issued before this feature alone rather than force-expiring it", () => {
    // No authTime means the session predates the stamp. Signing every existing
    // admin out mid-deploy buys nothing; it still dies at its own 30-day mark.
    expect(isAbsoluteSessionExpired("admin", undefined, now)).toBe(false);
  });

  it("ignores an undefined role", () => {
    expect(isAbsoluteSessionExpired(undefined, signedInAt(ADMIN_SESSION_MAX_AGE_MS * 10), now)).toBe(false);
  });
});
