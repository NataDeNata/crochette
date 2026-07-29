"use client";

import { useActionState } from "react";
import { adminLogin } from "@/app/admin/login/actions";
import { IDLE_LOGIN_STATE } from "@/lib/actions/admin-login-types";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";
import { Input } from "@/components/ui/input";

export function AdminLoginForm() {
  const [state, formAction, isPending] = useActionState(adminLogin, IDLE_LOGIN_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <Input
        name="email"
        type="email"
        placeholder="Email address"
        autoComplete="username"
        defaultValue={state.email}
        className="h-auto rounded-xl border-[1.5px] border-[oklch(0.75_0.03_20)] bg-[oklch(0.98_0.01_85)] px-[18px] py-3.5 text-sm"
      />
      <Input
        name="password"
        type="password"
        placeholder="Password"
        autoComplete="current-password"
        className="h-auto rounded-xl border-[1.5px] border-[oklch(0.75_0.03_20)] bg-[oklch(0.98_0.01_85)] px-[18px] py-3.5 text-sm"
      />
      <FieldError error={state.status === "error" ? state.message : undefined} />
      <SubmitButton isPending={isPending} label="Sign in" pendingLabel="Signing in…" />
    </form>
  );
}
