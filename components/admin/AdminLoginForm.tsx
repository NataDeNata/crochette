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
      {/* These two inputs used to carry a wholesale override of shadcn's Input
          — its own height, radius, border colour and background, all as raw
          oklch literals — and were the only place in /admin that restyled the
          primitive instead of using it. Removed 2026-07-30: the theme tokens
          give the default Input the right look, so the login fields now match
          every other admin field rather than being a one-off.

          `defaultValue={state.email}` stays load-bearing: Next re-renders this
          page's Server Component after every action call, which resets an
          uncontrolled input's DOM value, so a failed login used to silently
          blank the email field. */}
      <Input
        name="email"
        type="email"
        placeholder="Email address"
        autoComplete="username"
        defaultValue={state.email}
      />
      <Input name="password" type="password" placeholder="Password" autoComplete="current-password" />
      <FieldError error={state.status === "error" ? state.message : undefined} />
      <SubmitButton isPending={isPending} label="Sign in" pendingLabel="Signing in…" />
    </form>
  );
}
