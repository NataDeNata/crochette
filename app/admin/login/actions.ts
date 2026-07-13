"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import type { AdminLoginState } from "@/lib/actions/admin-login-types";

export async function adminLogin(_prevState: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const email = formData.get("email");
  try {
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirectTo: "/admin",
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
