import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/security/secret-box";

/**
 * The TOTP seed is the one credential stored recoverably rather than hashed, so
 * these assert the two properties that justify doing that: it round-trips, and
 * anything tampered with or unreadable comes back as `null` instead of
 * throwing on the login path.
 */
describe("secret-box", () => {
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

  it("round-trips a secret", () => {
    expect(decryptSecret(encryptSecret(secret))).toBe(secret);
  });

  it("never produces the same ciphertext twice", () => {
    // A fresh IV per encryption. Without it, two admins enrolling with the same
    // seed would be visibly identical in the table — and GCM catastrophically
    // loses confidentiality on IV reuse.
    const a = encryptSecret(secret);
    const b = encryptSecret(secret);
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(decryptSecret(b));
  });

  it("stores nothing that reveals the plaintext", () => {
    expect(encryptSecret(secret)).not.toContain(secret);
  });

  it("returns null when the ciphertext has been tampered with", () => {
    // GCM's auth tag is the point of using it over raw CTR: a row edited in the
    // database must fail closed, not decrypt to some other seed.
    const [iv, data, tag] = encryptSecret(secret).split(".");
    const flipped = Buffer.from(data, "base64url");
    flipped[0] ^= 0xff;
    expect(decryptSecret([iv, flipped.toString("base64url"), tag].join("."))).toBeNull();
  });

  it("returns null when the auth tag has been swapped", () => {
    const [iv, data] = encryptSecret(secret).split(".");
    const [, , otherTag] = encryptSecret("different-secret").split(".");
    expect(decryptSecret([iv, data, otherTag].join("."))).toBeNull();
  });

  it("returns null on malformed input rather than throwing", () => {
    // This runs inside authorize(). A throw here is a 500 on sign-in, so the
    // shape of the failure matters as much as the fact of it.
    for (const bad of ["", "not-encrypted", "a.b", "a.b.c.d", "...", "!!!.!!!.!!!"]) {
      expect(decryptSecret(bad)).toBeNull();
    }
  });
});
