"use client";

import { useActionState } from "react";
import { adminLogin } from "@/app/admin/login/actions";
import { IDLE_LOGIN_STATE } from "@/lib/actions/admin-login-types";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";

const inputStyle = {
  padding: "14px 18px",
  borderRadius: 12,
  border: "1.5px solid oklch(0.75 0.03 20)",
  background: "oklch(0.98 0.01 85)",
  fontSize: 14,
  fontFamily: "inherit",
} as const;

export function AdminLoginForm() {
  const [state, formAction, isPending] = useActionState(adminLogin, IDLE_LOGIN_STATE);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <input
        name="email"
        type="email"
        placeholder="Email address"
        autoComplete="username"
        defaultValue={state.email}
        style={inputStyle}
      />
      <input name="password" type="password" placeholder="Password" autoComplete="current-password" style={inputStyle} />
      <FieldError error={state.status === "error" ? state.message : undefined} />
      <SubmitButton isPending={isPending} label="Sign in" pendingLabel="Signing in…" />
    </form>
  );
}
