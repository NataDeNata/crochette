"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/lib/auth";
import { getClientIp, isAuthRateLimited } from "@/lib/security/rate-limit";
import { RATE_LIMITED_MESSAGE } from "@/lib/actions/types";
import type { AccountLoginState } from "@/lib/actions/auth-form-types";

/** Kicks off the Google OAuth redirect. No rate limiting here on purpose:
 * there are no credentials to guess, and Google owns that surface. */
export async function googleSignIn() {
  await signIn("google", { redirectTo: "/account" });
}

export async function accountLogin(_prevState: AccountLoginState, formData: FormData): Promise<AccountLoginState> {
  const email = formData.get("email");
  const emailKey = typeof email === "string" ? email.trim().toLowerCase() : "";
  const echo = typeof email === "string" ? email : undefined;

  if (await isAuthRateLimited("login", await getClientIp(), emailKey)) {
    return { status: "error", message: RATE_LIMITED_MESSAGE, email: echo };
  }

  try {
    await signIn("customer", {
      email,
      password: formData.get("password"),
      redirectTo: "/account",
    });
    return { status: "idle" };
  } catch (error) {
    // A rejected credential (`authorize()` returned null) surfaces as
    // `CredentialsSignin` specifically. Anything else that's still an
    // `AuthError` — `CallbackRouteError`, most likely — means `authorize()`
    // threw, which is a system failure (a DB error, say), not a wrong
    // password, and must not be reported as one: `lib/auth.ts` already logs
    // the underlying cause before rethrowing.
    if (error instanceof CredentialsSignin) {
      return { status: "error", message: "Incorrect email or password.", email: echo };
    }
    if (error instanceof AuthError) {
      return { status: "error", message: "Something went wrong on our end. Please try again in a moment.", email: echo };
    }
    // signIn() throws Next's internal redirect signal on success — rethrow
    // anything that isn't an auth failure so the navigation actually happens.
    throw error;
  }
}
