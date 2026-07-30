"use server";

import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { findCustomerByEmail, createCustomer } from "@/lib/db/accounts";
import { signupSchema } from "@/lib/validation/account";
import { notifyAccountCreated } from "@/lib/email/notifications";
import { getClientIp, isRateLimited } from "@/lib/security/rate-limit";
import type { AccountSignupState } from "@/lib/actions/account-signup-types";

export async function signupAccount(_prevState: AccountSignupState, formData: FormData): Promise<AccountSignupState> {
  const name = formData.get("name");
  const email = formData.get("email");

  const parsed = signupSchema.safeParse({
    name,
    email,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the fields below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
      name: typeof name === "string" ? name : undefined,
      email: typeof email === "string" ? email : undefined,
    };
  }

  const ip = await getClientIp();
  // IP-only first — it's the bucket an enumeration sweep can't escape by
  // varying the email. See lib/security/rate-limit.ts.
  if (
    (await isRateLimited("auth-ip", ip)) ||
    (await isRateLimited("signup", `${ip}:${parsed.data.email.toLowerCase()}`))
  ) {
    return {
      status: "error",
      message: "Too many attempts — please wait a few minutes and try again.",
      name: parsed.data.name,
      email: parsed.data.email,
    };
  }

  // This says outright what the login timing oracle used to leak indirectly:
  // that an address has an account here. Kept deliberately — a signup form
  // that silently accepts a duplicate email has no honest way to explain what
  // went wrong, and every store makes this same trade. Login is the surface
  // where the leak was worth closing, and it now is (see lib/auth.ts).
  const existing = await findCustomerByEmail(parsed.data.email);
  if (existing) {
    return {
      status: "error",
      message: "Please check the fields below.",
      fieldErrors: { email: ["An account with that email already exists — try signing in instead."] },
      name: parsed.data.name,
      email: parsed.data.email,
    };
  }

  const passwordHash = await hash(parsed.data.password, 12);
  await createCustomer({ email: parsed.data.email, passwordHash, name: parsed.data.name });

  await notifyAccountCreated({ email: parsed.data.email, name: parsed.data.name });

  try {
    await signIn("customer", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/account",
    });
    return { status: "idle" };
  } catch (error) {
    if (error instanceof AuthError) {
      // Account was created but auto-sign-in failed for some reason — send
      // them to log in manually rather than surfacing a confusing error.
      return { status: "error", message: "Your account was created — please sign in.", email: parsed.data.email };
    }
    // signIn() throws Next's internal redirect signal on success — rethrow
    // anything that isn't an auth failure so the navigation actually happens.
    throw error;
  }
}
