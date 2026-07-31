import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { testDb } from "../helpers/db";
import { makeAdmin } from "../helpers/factories";
import { admins } from "@/lib/db/schema";
import { encryptSecret } from "@/lib/security/secret-box";
import { generateBackupCodes, hashBackupCode } from "@/lib/security/totp";
import {
  beginTotpEnrolment,
  confirmTotpEnrolment,
  disableTotp,
  getAdminSecurityState,
  verifyAdminSecondFactor,
} from "@/lib/db/admin-account";

/** RFC 6238's test seed — the code below is its published value at t=59. */
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
const RFC_CODE_AT_59 = "287082";

async function enrolledAdmin(backupCodes: string[] = []) {
  const admin = await makeAdmin();
  await testDb
    .update(admins)
    .set({
      totpSecret: encryptSecret(RFC_SECRET),
      totpConfirmedAt: new Date(),
      totpBackupCodes: backupCodes.map(hashBackupCode),
    })
    .where(eq(admins.id, admin.id));
  return admin;
}

/**
 * The parts of the second factor that only the database can answer for:
 * whether a backup code can be spent twice, and whether the enrolment state
 * machine can be walked into a position where 2FA looks on but isn't.
 */
describe("verifyAdminSecondFactor", () => {
  it("accepts a current TOTP code", async () => {
    const admin = await enrolledAdmin();
    vi.useFakeTimers();
    vi.setSystemTime(59_000);
    try {
      expect(await verifyAdminSecondFactor(admin.id, RFC_CODE_AT_59)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects a wrong code", async () => {
    const admin = await enrolledAdmin();
    vi.useFakeTimers();
    vi.setSystemTime(59_000);
    try {
      expect(await verifyAdminSecondFactor(admin.id, "000000")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("refuses everything when no enrolment is confirmed", async () => {
    // A secret that was generated but never confirmed must not authenticate
    // anything — otherwise starting a setup and abandoning it would silently
    // arm a factor the owner never scanned.
    const admin = await makeAdmin();
    await testDb.update(admins).set({ totpSecret: encryptSecret(RFC_SECRET) }).where(eq(admins.id, admin.id));

    vi.useFakeTimers();
    vi.setSystemTime(59_000);
    try {
      expect(await verifyAdminSecondFactor(admin.id, RFC_CODE_AT_59)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("accepts a backup code and spends it", async () => {
    const codes = generateBackupCodes();
    const admin = await enrolledAdmin(codes);

    expect(await verifyAdminSecondFactor(admin.id, codes[0])).toBe(true);
    // The same code a second time is the thing a "single-use" code must refuse.
    expect(await verifyAdminSecondFactor(admin.id, codes[0])).toBe(false);

    const state = await getAdminSecurityState(admin.id);
    expect(state?.backupCodesRemaining).toBe(codes.length - 1);
  });

  it("spends a backup code exactly once under concurrent submission", async () => {
    // The reason matching and spending are one statement rather than a read
    // followed by a write: two requests carrying the same code must not both
    // be told yes.
    const codes = generateBackupCodes();
    const admin = await enrolledAdmin(codes);

    const results = await Promise.all([
      verifyAdminSecondFactor(admin.id, codes[0]),
      verifyAdminSecondFactor(admin.id, codes[0]),
      verifyAdminSecondFactor(admin.id, codes[0]),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect((await getAdminSecurityState(admin.id))?.backupCodesRemaining).toBe(codes.length - 1);
  });

  it("leaves other backup codes usable", async () => {
    const codes = generateBackupCodes();
    const admin = await enrolledAdmin(codes);

    await verifyAdminSecondFactor(admin.id, codes[0]);

    expect(await verifyAdminSecondFactor(admin.id, codes[1])).toBe(true);
  });

  it("accepts a backup code however it was transcribed", async () => {
    const codes = generateBackupCodes();
    const admin = await enrolledAdmin(codes);

    expect(await verifyAdminSecondFactor(admin.id, codes[0].toLowerCase().replace("-", " "))).toBe(true);
  });

  it("rejects a backup code belonging to a different admin", async () => {
    const codes = generateBackupCodes();
    await enrolledAdmin(codes);
    const other = await enrolledAdmin(generateBackupCodes());

    expect(await verifyAdminSecondFactor(other.id, codes[0])).toBe(false);
  });
});

describe("enrolment state", () => {
  it("does not arm the factor until a code confirms it", async () => {
    const admin = await makeAdmin();
    await beginTotpEnrolment(admin.id, admin.email);

    const pending = await getAdminSecurityState(admin.id);
    expect(pending?.totpPending).toBe(true);
    expect(pending?.totpConfirmedAt).toBeNull();
  });

  it("refuses to confirm with a wrong code", async () => {
    const admin = await makeAdmin();
    await beginTotpEnrolment(admin.id, admin.email);

    expect(await confirmTotpEnrolment(admin.id, "000000")).toEqual({ ok: false });
    expect((await getAdminSecurityState(admin.id))?.totpConfirmedAt).toBeNull();
  });

  it("issues backup codes once the enrolment is confirmed", async () => {
    const admin = await makeAdmin();
    await beginTotpEnrolment(admin.id, admin.email);
    // Point the stored secret at the RFC seed so a known code confirms it.
    await testDb.update(admins).set({ totpSecret: encryptSecret(RFC_SECRET) }).where(eq(admins.id, admin.id));

    vi.useFakeTimers();
    vi.setSystemTime(59_000);
    let result;
    try {
      result = await confirmTotpEnrolment(admin.id, RFC_CODE_AT_59);
    } finally {
      vi.useRealTimers();
    }

    expect(result).toMatchObject({ ok: true });
    expect(result && "backupCodes" in result && result.backupCodes).toHaveLength(10);

    const state = await getAdminSecurityState(admin.id);
    expect(state?.totpConfirmedAt).toBeInstanceOf(Date);
    expect(state?.backupCodesRemaining).toBe(10);
  });

  it("clears the secret and the codes when turned off", async () => {
    // A later re-enrolment has to start from a fresh seed, not revive codes the
    // owner may have printed and lost.
    const admin = await enrolledAdmin(generateBackupCodes());

    await disableTotp(admin.id);

    const state = await getAdminSecurityState(admin.id);
    expect(state?.totpConfirmedAt).toBeNull();
    expect(state?.totpPending).toBe(false);
    expect(state?.backupCodesRemaining).toBe(0);
  });
});
