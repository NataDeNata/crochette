"use server";

import { signOut } from "@/lib/auth";

export async function accountSignOut() {
  await signOut({ redirectTo: "/" });
}
