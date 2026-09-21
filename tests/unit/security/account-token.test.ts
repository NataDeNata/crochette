import { describe, expect, it } from "vitest";
import {
  mintEmailVerificationToken,
  mintPasswordResetToken,
  verifyEmailVerificationToken,
  verifyPasswordResetToken,
} from "@/lib/security/account-token";

/**
 * Stage B's two links. Both are bearer credentials mailed to an inbox, so the
 * tests that matter are the negative ones — and one of them is structural
 * rather than per-token: a verification link and a reset link are HMACs over
 * the same customer id under the same secret, so **the purpose field is the
 * only thing standing between a seven-day link mailed to an unproven address
 * and a valid password reset.** That is the test at the bottom of this file,
 * and it is the load-bearing one.
 */
describe("account tokens", () => {
  const customerId = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
  const otherCustomerId = "00000000-0000-0000-0000-000000000000";
  const email = "sam@example.com";
  const now = 1_700_000_000_000;
  const minute = 60 * 1000;
  const day = 24 * 60 * 60 * 1000;

  describe("email verification", () => {
    it("round-trips the customer and the address it proves", () => {
      const token = mintEmailVerificationToken(customerId, email, now);
      expect(verifyEmailVerificationToken(token, now + minute)).toEqual({ customerId, email });
    });

    it("normalises the bound address the same way the customers table does", () => {
      // `customers.email` is lowercased on every write, so a token minted from
      // a mixed-case form must still compare equal to the stored row — this is
      // what stops "verified, but the address doesn't match" for someone who
      // typed their own address with a capital.
      const token = mintEmailVerificationToken(customerId, "  Sam@Example.COM ", now);
      expect(verifyEmailVerificationToken(token, now + minute)?.email).toBe(email);
    });

    it("carries an address containing a dot through the field separator", () => {
      // The payload is dot-delimited and an address may contain dots, which is
      // why the address rides base64url-encoded. Without that this token has
      // six fields and reads as malformed.
      const dotted = "sam.smith.jr@example.co.uk";
      const token = mintEmailVerificationToken(customerId, dotted, now);
      expect(verifyEmailVerificationToken(token, now + minute)).toEqual({ customerId, email: dotted });
    });

    it("expires after seven days", () => {
      const token = mintEmailVerificationToken(customerId, email, now);
      expect(verifyEmailVerificationToken(token, now + 6 * day)).not.toBeNull();
      expect(verifyEmailVerificationToken(token, now + 8 * day)).toBeNull();
    });

    it("rejects a token whose customer id was swapped", () => {
      const token = mintEmailVerificationToken(customerId, email, now);
      const [purpose, , bound, expiresAt, signature] = token.split(".");
      const forged = [purpose, otherCustomerId, bound, expiresAt, signature].join(".");
      expect(verifyEmailVerificationToken(forged, now + minute)).toBeNull();
    });

    it("rejects a token whose bound address was swapped", () => {
      // The attack the binding exists to stop: take the link mailed to you,
      // point it at someone else's address, have the account stamped as
      // proving an address you don't control.
      const token = mintEmailVerificationToken(customerId, email, now);
      const [purpose, id, , expiresAt, signature] = token.split(".");
      const otherBound = Buffer.from("victim@example.com", "utf8").toString("base64url");
      const forged = [purpose, id, otherBound, expiresAt, signature].join(".");
      expect(verifyEmailVerificationToken(forged, now + minute)).toBeNull();
    });

    it("rejects a token whose expiry was extended", () => {
      const token = mintEmailVerificationToken(customerId, email, now);
      const [purpose, id, bound, , signature] = token.split(".");
      const forged = [purpose, id, bound, String(now + 365 * day), signature].join(".");
      expect(verifyEmailVerificationToken(forged, now + 8 * day)).toBeNull();
    });

    it("rejects malformed shapes", () => {
      for (const bad of ["", customerId, `v1.${customerId}`, "a.b.c.d.e", `v1.${customerId}.x.${now + minute}.`]) {
        expect(verifyEmailVerificationToken(bad, now)).toBeNull();
      }
    });

    it("rejects a non-numeric expiry", () => {
      const token = mintEmailVerificationToken(customerId, email, now);
      const [purpose, id, bound, , signature] = token.split(".");
      expect(verifyEmailVerificationToken([purpose, id, bound, "later", signature].join("."), now)).toBeNull();
    });
  });

  describe("password reset", () => {
    const changedAt = new Date(now - day);

    it("round-trips the customer and the stamp it was minted against", () => {
      const token = mintPasswordResetToken(customerId, changedAt, now);
      expect(verifyPasswordResetToken(token, now + minute)).toEqual({
        customerId,
        passwordChangedAtMs: changedAt.getTime(),
      });
    });

    it("binds a never-rotated account as 0 rather than refusing to mint", () => {
      // Every account starts with a null `password_changed_at`, so this is the
      // normal case, not an edge one. The caller compares against `?? 0`.
      const token = mintPasswordResetToken(customerId, null, now);
      expect(verifyPasswordResetToken(token, now + minute)).toEqual({ customerId, passwordChangedAtMs: 0 });
    });

    it("expires after two hours", () => {
      const token = mintPasswordResetToken(customerId, changedAt, now);
      expect(verifyPasswordResetToken(token, now + 119 * minute)).not.toBeNull();
      expect(verifyPasswordResetToken(token, now + 121 * minute)).toBeNull();
    });

    it("dies much sooner than a verification link", () => {
      // Stated as a relationship because the two lifetimes encode a judgement
      // about what each link grants — a reset hands over the account, a
      // verification proves an address — and a later edit that equalised them
      // would be silently wrong rather than obviously so.
      const reset = mintPasswordResetToken(customerId, changedAt, now);
      const verification = mintEmailVerificationToken(customerId, email, now);
      expect(verifyPasswordResetToken(reset, now + day)).toBeNull();
      expect(verifyEmailVerificationToken(verification, now + day)).not.toBeNull();
    });

    it("rejects a token whose bound stamp was edited", () => {
      // The attack single-use rests on: spend the link, then rewrite the stamp
      // in the token to match the row's new value and spend it again.
      const token = mintPasswordResetToken(customerId, changedAt, now);
      const [purpose, id, , expiresAt, signature] = token.split(".");
      const forged = [purpose, id, String(now), expiresAt, signature].join(".");
      expect(verifyPasswordResetToken(forged, now + minute)).toBeNull();
    });

    it("rejects a token whose customer id was swapped", () => {
      const token = mintPasswordResetToken(customerId, changedAt, now);
      const [purpose, , bound, expiresAt, signature] = token.split(".");
      const forged = [purpose, otherCustomerId, bound, expiresAt, signature].join(".");
      expect(verifyPasswordResetToken(forged, now + minute)).toBeNull();
    });
  });

  it("will not let a verification link be spent as a password reset, or the reverse", () => {
    // The one that justifies putting the purpose inside the signature. Both
    // tokens are HMACs over the same customer id under AUTH_SECRET; without a
    // purpose field, the link mailed to an address nobody has proven yet —
    // which lives for seven days — would verify as a validly signed reset for
    // that account. Rewriting the purpose byte is not enough either, since it
    // is signed.
    const verification = mintEmailVerificationToken(customerId, email, now);
    const reset = mintPasswordResetToken(customerId, null, now);

    expect(verifyPasswordResetToken(verification, now + minute)).toBeNull();
    expect(verifyEmailVerificationToken(reset, now + minute)).toBeNull();

    const relabelled = ["r1", ...verification.split(".").slice(1)].join(".");
    expect(verifyPasswordResetToken(relabelled, now + minute)).toBeNull();
  });
});
