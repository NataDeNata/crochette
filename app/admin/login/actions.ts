"use server";

import { cookies } from "next/headers";
import { AuthError } from "next-auth";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { admins } from "@/lib/db/schema";
import { signIn } from "@/lib/auth";
import { DUMMY_PASSWORD_HASH } from "@/lib/auth-session";
import { getClientIp, isRateLimited } from "@/lib/security/rate-limit";
import { ADMIN_CHALLENGE_COOKIE, mintAdminChallenge } from "@/lib/security/admin-challenge";
import { logInfo } from "@/lib/observability/log";
import type { AdminLoginState } from "@/lib/actions/admin-login-types";

const GENERIC_FAILURE = "Incorrect email or password.";
const TOO_MANY = "Too many attempts — please wait a few minutes and try again.";

/** Scoped to the login route so the browser never sends it anywhere else, and
 * httpOnly so no script can read it. `secure` is dropped on localhost, where
 * there is no https and the cookie would otherwise be silently discarded. */
async function setChallengeCookie(value: string): Promise<void> {
  (await cookies()).set(ADMIN_CHALLENGE_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin/login",
    maxAge: 3 * 60,
  });
}

/**
 * Step one: email and password.
 *
 * The password is verified *here* rather than being left entirely to
 * `authorize()`, because this is the only place that can tell the form "now ask
 * for a code" — `authorize()` can only say yes or no. What it hands forward is
 * a signed challenge, not the password, so step two never has to re-post the
 * password or keep it in the DOM.
 *
 * An admin without 2FA never sees step two: the challenge is spent immediately.
 */
export async function adminLogin(_prevState: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const emailKey = typeof email === "string" ? email.trim().toLowerCase() : "";
  const echo = typeof email === "string" ? email : undefined;

  const ip = await getClientIp();
  // IP-only first — it's the bucket an enumeration sweep can't escape by
  // varying the email. See lib/security/rate-limit.ts.
  if ((await isRateLimited("auth-ip", ip)) || (await isRateLimited("admin-login", `${ip}:${emailKey}`))) {
    return { status: "error", message: TOO_MANY, email: echo };
  }

  if (!emailKey || typeof password !== "string" || !password) {
    return { status: "error", message: GENERIC_FAILURE, email: echo };
  }

  const [admin] = await db
    .select({
      id: admins.id,
      passwordHash: admins.passwordHash,
      totpConfirmedAt: admins.totpConfirmedAt,
    })
    .from(admins)
    .where(eq(admins.email, emailKey))
    .limit(1);

  // Same constant-time shape as `authorize()`: the not-found path spends the
  // ~250ms a real bcrypt costs, so response time doesn't answer "does this
  // address have an account here?".
  if (!admin) {
    await compare(password, DUMMY_PASSWORD_HASH);
    return { status: "error", message: GENERIC_FAILURE, email: echo };
  }
  if (!(await compare(password, admin.passwordHash))) {
    return { status: "error", message: GENERIC_FAILURE, email: echo };
  }

  const challenge = mintAdminChallenge(admin.id);

  if (admin.totpConfirmedAt) {
    await setChallengeCookie(challenge);
    logInfo("auth.admin.second_factor_required", { adminId: admin.id });
    return { status: "totp", email: echo };
  }

  return finishSignIn(challenge, "", echo);
}

/**
 * Step two: the six-digit code, or a backup code.
 *
 * Only the code is posted. The identity comes from the challenge cookie, so
 * this cannot be pointed at a different account than step one authenticated —
 * and `authorize()` re-checks the code against the database regardless, so a
 * hand-built POST that skips this action gains nothing.
 */
export async function adminLoginTotp(_prevState: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const code = formData.get("code");

  const ip = await getClientIp();
  if (await isRateLimited("admin-totp", ip)) {
    return { status: "totp", message: TOO_MANY };
  }

  const challenge = (await cookies()).get(ADMIN_CHALLENGE_COOKIE)?.value;
  if (!challenge) {
    // Expired or never issued — there is nothing to attach a code to, so the
    // password step has to happen again.
    return { status: "error", message: "That took too long — please sign in again." };
  }

  if (typeof code !== "string" || !code.trim()) {
    return { status: "totp", message: "Enter the 6-digit code from your authenticator app." };
  }

  return finishSignIn(challenge, code.trim(), undefined, {
    status: "totp",
    message: "That code isn't right — check your app and try again.",
  });
}

/**
 * Hand the challenge to `authorize()` and let it decide.
 *
 * `signIn` throws on both outcomes — an `AuthError` when the credentials are
 * refused, and Next's internal redirect signal when they are accepted — which
 * is why the success path is a rethrow rather than a return.
 */
async function finishSignIn(
  challenge: string,
  totp: string,
  email: string | undefined,
  onFailure: AdminLoginState = { status: "error", message: GENERIC_FAILURE },
): Promise<AdminLoginState> {
  try {
    await signIn("admin", { challenge, totp, redirectTo: "/admin" });
    return { status: "idle" };
  } catch (error) {
    if (error instanceof AuthError) return { ...onFailure, email };
    throw error;
  }
}
