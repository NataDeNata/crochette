"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth-guard";
import {
  beginTotpEnrolment,
  confirmTotpEnrolment,
  disableTotp,
  getAdminSecurityState,
  regenerateBackupCodes,
  verifyAdminPassword,
  verifyAdminSecondFactor,
  setAdminPassword,
} from "@/lib/db/admin-account";
import { adminPasswordChangeSchema, secondFactorCodeSchema } from "@/lib/validation/admin-account";
import { getClientIp, isRateLimited } from "@/lib/security/rate-limit";
import { logInfo } from "@/lib/observability/log";
import { invalidFields, RATE_LIMITED_MESSAGE, type FormActionState } from "@/lib/actions/types";

/** State for the 2FA forms. `backupCodes` is present on exactly one render —
 * the one right after enrolment or a regeneration — because only the hashes are
 * stored and this is the last moment the plaintext exists anywhere. */
export type TotpActionState = FormActionState & { backupCodes?: string[] };

const WRONG_PASSWORD = "That password isn't right.";

/**
 * Every sensitive change on this page re-checks the password first.
 *
 * The 8-hour session cap limits how long a walked-away-from browser stays
 * useful; this limits what it can do in the meantime. Rate-limited on the same
 * IP bucket as login, because a form that says "wrong password" is an oracle
 * for guessing one just as much as the login form is.
 */
async function reauthenticate(adminId: string, password: unknown): Promise<string | null> {
  if (await isRateLimited("auth-ip", await getClientIp())) {
    return RATE_LIMITED_MESSAGE;
  }
  if (typeof password !== "string" || !password) return WRONG_PASSWORD;
  if (!(await verifyAdminPassword(adminId, password))) return WRONG_PASSWORD;
  return null;
}

/**
 * Change the admin password.
 *
 * This deliberately ends the current session. `setAdminPassword` stamps
 * `passwordChangedAt`, and lib/auth.ts's jwt callback rejects every admin token
 * issued before that instant — the mechanism that makes a rotation revoke a
 * stolen session on another device. There is no way to exempt this browser from
 * it without also exempting the attacker's, so the honest ending is to sign out
 * and say so on the login page.
 */
export async function changeAdminPassword(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const admin = await requireAdmin();

  const parsed = adminPasswordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) return invalidFields(parsed.error);

  const failure = await reauthenticate(admin.id, parsed.data.currentPassword);
  if (failure) return { status: "error", message: failure, fieldErrors: { currentPassword: [failure] } };

  await setAdminPassword(admin.id, parsed.data.newPassword);
  logInfo("admin.password_changed", { adminId: admin.id });

  // `redirect: false` so the sign-out doesn't throw its own redirect and race
  // the one below; this needs to land on the login page with the notice.
  await signOut({ redirect: false });
  redirect("/admin/login?changed=1");
}

/**
 * Generates a fresh seed and drops the admin into the "scan this" state.
 *
 * Both of these actions refuse outright when 2FA is already confirmed, and that
 * guard is not cosmetic — it is the difference between a button and a bypass.
 * `beginTotpEnrolment` clears `totpConfirmedAt` and `cancelTotpEnrolment`
 * clears everything, so without the check either one would be a way to switch
 * the second factor off from a hijacked session with no password and no code,
 * defeating the whole point of `turnOffTotp` asking for both. Turning it off
 * has exactly one door.
 */
export async function startTotpEnrolment(): Promise<void> {
  const admin = await requireAdmin();
  const state = await getAdminSecurityState(admin.id);
  if (state?.totpConfirmedAt) return;

  await beginTotpEnrolment(admin.id, admin.email);
  logInfo("admin.totp.enrolment_started", { adminId: admin.id });
  revalidatePath("/admin/settings");
}

export async function cancelTotpEnrolment(): Promise<void> {
  const admin = await requireAdmin();
  const state = await getAdminSecurityState(admin.id);
  if (state?.totpConfirmedAt) return;

  await disableTotp(admin.id);
  revalidatePath("/admin/settings");
}

/** Confirm the scan with a live code. Nothing is switched on until this passes
 * — see the `totpConfirmedAt` column comment for why the secret alone must not
 * enable the second factor. */
export async function confirmTotp(
  _prevState: TotpActionState,
  formData: FormData
): Promise<TotpActionState> {
  const admin = await requireAdmin();

  if (await isRateLimited("admin-totp", await getClientIp())) {
    return { status: "error", message: RATE_LIMITED_MESSAGE };
  }

  const parsed = secondFactorCodeSchema.safeParse(formData.get("code"));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Enter the 6-digit code." };
  }

  const result = await confirmTotpEnrolment(admin.id, parsed.data);
  if (!result.ok) {
    return { status: "error", message: "That code isn't right. Check your app's clock and try again." };
  }

  logInfo("admin.totp.enabled", { adminId: admin.id });
  revalidatePath("/admin/settings");
  return {
    status: "success",
    message: "Two-factor authentication is on. Save these backup codes now. They aren't shown again.",
    backupCodes: result.backupCodes,
  };
}

/**
 * Turn 2FA off. Needs the password *and* a current code.
 *
 * Both, because either one alone would make the second factor removable by
 * whoever holds only the other — and removing it is exactly what an attacker
 * with a hijacked session would want to do first.
 */
export async function turnOffTotp(
  _prevState: TotpActionState,
  formData: FormData
): Promise<TotpActionState> {
  const admin = await requireAdmin();

  const failure = await reauthenticate(admin.id, formData.get("password"));
  if (failure) return { status: "error", message: failure };

  const parsed = secondFactorCodeSchema.safeParse(formData.get("code"));
  if (!parsed.success || !(await verifyAdminSecondFactor(admin.id, parsed.data))) {
    return { status: "error", message: "That code isn't right." };
  }

  await disableTotp(admin.id);
  logInfo("admin.totp.disabled", { adminId: admin.id });
  revalidatePath("/admin/settings");
  return { status: "success", message: "Two-factor authentication is off." };
}

/** Reissue backup codes, invalidating the old set. Password-gated for the same
 * reason turning 2FA off is. */
export async function reissueBackupCodes(
  _prevState: TotpActionState,
  formData: FormData
): Promise<TotpActionState> {
  const admin = await requireAdmin();

  const failure = await reauthenticate(admin.id, formData.get("password"));
  if (failure) return { status: "error", message: failure };

  const backupCodes = await regenerateBackupCodes(admin.id);
  logInfo("admin.totp.backup_codes_reissued", { adminId: admin.id });
  revalidatePath("/admin/settings");
  return {
    status: "success",
    message: "New backup codes. The previous set no longer works.",
    backupCodes,
  };
}
