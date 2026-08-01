import { describe, expect, it } from "vitest";
import { mintAdminChallenge, verifyAdminChallenge } from "@/lib/security/admin-challenge";

/**
 * The challenge is what lets step two of admin login skip re-checking the
 * password. That makes it a bearer credential, so the tests that matter are the
 * negative ones: an unsigned, re-signed, edited or expired token must be worth
 * nothing.
 */
describe("admin login challenge", () => {
  const adminId = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
  const now = 1_700_000_000_000;

  it("round-trips the admin id", () => {
    expect(verifyAdminChallenge(mintAdminChallenge(adminId, now), now + 1000)).toBe(adminId);
  });

  it("expires", () => {
    const token = mintAdminChallenge(adminId, now);
    // Still good just before the cutoff…
    expect(verifyAdminChallenge(token, now + 2 * 60 * 1000)).toBe(adminId);
    // …and worthless after it. A stolen cookie has a bounded life.
    expect(verifyAdminChallenge(token, now + 4 * 60 * 1000)).toBeNull();
  });

  it("rejects a token whose admin id was swapped", () => {
    // The attack this exists to stop: hold a valid challenge for your own
    // account, repoint it at someone else's, keep the signature.
    const token = mintAdminChallenge(adminId, now);
    const [, expiresAt, signature] = token.split(".");
    const forged = ["00000000-0000-0000-0000-000000000000", expiresAt, signature].join(".");
    expect(verifyAdminChallenge(forged, now + 1000)).toBeNull();
  });

  it("rejects a token whose expiry was extended", () => {
    const token = mintAdminChallenge(adminId, now);
    const [id, , signature] = token.split(".");
    const forged = [id, String(now + 86_400_000), signature].join(".");
    expect(verifyAdminChallenge(forged, now + 1000)).toBeNull();
  });

  it("rejects an unsigned or malformed token", () => {
    for (const bad of ["", adminId, `${adminId}.${now + 1000}`, "a.b.c", `${adminId}.${now + 1000}.`]) {
      expect(verifyAdminChallenge(bad, now)).toBeNull();
    }
  });

  it("rejects a non-numeric expiry", () => {
    // Guards against `Number("later")` → NaN sliding past a naive `now >= exp`
    // comparison, which is false for NaN.
    const forged = `${adminId}.later.${mintAdminChallenge(adminId, now).split(".")[2]}`;
    expect(verifyAdminChallenge(forged, now)).toBeNull();
  });

  it("issues a different token each time", () => {
    expect(mintAdminChallenge(adminId, now)).not.toBe(mintAdminChallenge(adminId, now + 1));
  });
});
