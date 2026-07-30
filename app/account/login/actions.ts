"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { getClientIp, isRateLimited } from "@/lib/security/rate-limit";
import type { AccountLoginState } from "@/lib/actions/account-login-types";

/** Kicks off the Google OAuth redirect. No rate limiting here on purpose:
 * there are no credentials to guess, and Google owns that surface. */
export async function googleSignIn() {
  await signIn("google", { redirectTo: "/account" });
}

export async function accountLogin(_prevState: AccountLoginState, formData: FormData): Promise<AccountLoginState> {
  const email = formData.get("email");
  const emailKey = typeof email === "string" ? email.trim().toLowerCase() : "";

  const ip = await getClientIp();
  // IP-only first — it's the bucket an enumeration sweep can't escape by
  // varying the email. See lib/security/rate-limit.ts.
  if ((await isRateLimited("auth-ip", ip)) || (await isRateLimited("login", `${ip}:${emailKey}`))) {
    return {
      status: "error",
      message: "Too many attempts — please wait a few minutes and try again.",
      email: typeof email === "string" ? email : undefined,
    };
  }

  try {
    await signIn("customer", {
      email,
      password: formData.get("password"),
      redirectTo: "/account",
    });
    return { status: "idle" };
  } catch (error) {
    if (error instanceof AuthError) {
      return { status: "error", message: "Incorrect email or password.", email: typeof email === "string" ? email : undefined };
    }
    // signIn() throws Next's internal redirect signal on success — rethrow
    // anything that isn't an auth failure so the navigation actually happens.
    throw error;
  }
}
