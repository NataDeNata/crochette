"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { getClientIp, isRateLimited, recordFailedAttempt } from "@/lib/security/rate-limit";
import type { AccountLoginState } from "@/lib/actions/account-login-types";

export async function accountLogin(_prevState: AccountLoginState, formData: FormData): Promise<AccountLoginState> {
  const email = formData.get("email");
  const emailKey = typeof email === "string" ? email.trim().toLowerCase() : "";

  const ip = await getClientIp();
  const rateLimitKey = `login:${ip}:${emailKey}`;
  if (isRateLimited(rateLimitKey)) {
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
      recordFailedAttempt(rateLimitKey);
      return { status: "error", message: "Incorrect email or password.", email: typeof email === "string" ? email : undefined };
    }
    // signIn() throws Next's internal redirect signal on success — rethrow
    // anything that isn't an auth failure so the navigation actually happens.
    throw error;
  }
}
