import { afterEach, describe, expect, it, vi } from "vitest";
import {
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  normalizeBackupCode,
  totpUri,
  verifyTotp,
} from "@/lib/security/totp";

/**
 * RFC 6238 Appendix B, the published test vectors — the whole reason this file
 * is worth having.
 *
 * Checking `verifyTotp` against a code this project generated itself would pass
 * just as happily with the counter endianness backwards or the base32 alphabet
 * wrong: both sides would agree, and every authenticator app on earth would
 * disagree. Pinning to the RFC's own numbers is what catches "works in tests,
 * locks the owner out in production".
 *
 * The secret is the ASCII string "12345678901234567890"; the RFC prints 8-digit
 * codes, of which a 6-digit setup shows the last six.
 */
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
const RFC_VECTORS = [
  { epochSeconds: 59, code: "287082" },
  { epochSeconds: 1111111109, code: "081804" },
  // Leading zero on purpose: it is what a `type="number"` input would eat.
  { epochSeconds: 1234567890, code: "005924" },
];

afterEach(() => {
  vi.useRealTimers();
});

function at(epochSeconds: number) {
  vi.useFakeTimers();
  vi.setSystemTime(epochSeconds * 1000);
}

describe("verifyTotp", () => {
  it.each(RFC_VECTORS)("accepts the RFC 6238 code at t=$epochSeconds", ({ epochSeconds, code }) => {
    at(epochSeconds);
    expect(verifyTotp(RFC_SECRET, code)).toBe(true);
  });

  it("accepts a code the user typed with the space their app displays", () => {
    at(59);
    expect(verifyTotp(RFC_SECRET, "287 082")).toBe(true);
  });

  it("rejects a wrong code at a time when a different code is valid", () => {
    at(59);
    expect(verifyTotp(RFC_SECRET, "000000")).toBe(false);
  });

  it("tolerates one period of clock drift either side", () => {
    // ±30s is the documented allowance. A phone whose clock is a few seconds
    // out is the single most common "my code doesn't work" report.
    at(59 - 30);
    expect(verifyTotp(RFC_SECRET, "287082")).toBe(true);
    at(59 + 30);
    expect(verifyTotp(RFC_SECRET, "287082")).toBe(true);
  });

  it("rejects a code two periods stale", () => {
    // The other half of the drift window: it has to be bounded, or a code
    // shoulder-surfed minutes ago still works.
    at(59 + 90);
    expect(verifyTotp(RFC_SECRET, "287082")).toBe(false);
  });

  it("rejects anything that isn't six digits", () => {
    at(59);
    // Guards the length check specifically: without it, a stripped-down empty
    // string could reach the library and its behaviour there is not ours to
    // assume.
    for (const input of ["", "28708", "2870821", "abcdef", "   "]) {
      expect(verifyTotp(RFC_SECRET, input)).toBe(false);
    }
  });
});

describe("generateTotpSecret", () => {
  it("produces a distinct 160-bit base32 secret each time", () => {
    const secrets = new Set(Array.from({ length: 50 }, generateTotpSecret));
    expect(secrets.size).toBe(50);
    for (const secret of secrets) {
      // 160 bits in base32 is 32 characters, the length RFC 4226 §4 requires
      // and every authenticator app expects.
      expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    }
  });
});

describe("totpUri", () => {
  it("carries the issuer and the account the code belongs to", () => {
    const uri = totpUri(RFC_SECRET, "owner@example.com");
    // The issuer is what stops the entry reading as an anonymous "6-digit code"
    // in an app holding a dozen of them.
    expect(uri).toContain("issuer=Crochette");
    expect(uri).toContain(encodeURIComponent("owner@example.com"));
    expect(uri).toContain(`secret=${RFC_SECRET}`);
    expect(uri.startsWith("otpauth://totp/")).toBe(true);
  });

  it("pins the parameters every authenticator app actually implements", () => {
    // SHA-256 or 8 digits scan without complaint and then silently produce
    // rejected codes in several popular apps.
    const uri = totpUri(RFC_SECRET, "owner@example.com");
    expect(uri).toContain("algorithm=SHA1");
    expect(uri).toContain("digits=6");
    expect(uri).toContain("period=30");
  });
});

describe("backup codes", () => {
  it("issues ten distinct codes from an unambiguous alphabet", () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) {
      // No I, L, O, 0 or 1 — these get transcribed off a printout by hand.
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/);
    }
  });

  it("does not repeat across separate issuances", () => {
    const first = new Set(generateBackupCodes());
    const second = generateBackupCodes();
    expect(second.some((code) => first.has(code))).toBe(false);
  });

  it("hashes to the same value however the code was typed", () => {
    // Someone reading a printed code types it lowercase, or without the hyphen,
    // or with a stray space. All three have to reach the same hash, because the
    // hash is what the SQL match compares against.
    const canonical = hashBackupCode("ABCDE-FGHJK");
    expect(hashBackupCode("abcde-fghjk")).toBe(canonical);
    expect(hashBackupCode("ABCDEFGHJK")).toBe(canonical);
    expect(hashBackupCode(" abcde fghjk ")).toBe(canonical);
  });

  it("hashes distinct codes distinctly", () => {
    expect(hashBackupCode("ABCDE-FGHJK")).not.toBe(hashBackupCode("ABCDE-FGHJM"));
  });

  it("normalizes to bare uppercase alphanumerics", () => {
    expect(normalizeBackupCode(" ab-cd ef ")).toBe("ABCDEF");
  });
});
