"use client";

import { useActionState } from "react";
import { accountLogin } from "@/app/account/login/actions";
import { IDLE_ACCOUNT_LOGIN_STATE } from "@/lib/actions/account-login-types";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";
import { Input } from "@/components/ui/input";

const fieldClassName =
  "h-auto rounded-xl border-[1.5px] border-input bg-[oklch(0.98_0.01_85)] px-[18px] py-3.5 text-sm";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(accountLogin, IDLE_ACCOUNT_LOGIN_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <Input
        name="email"
        type="email"
        placeholder="Email address"
        autoComplete="username"
        defaultValue={state.email}
        className={fieldClassName}
      />
      <Input
        name="password"
        type="password"
        placeholder="Password"
        autoComplete="current-password"
        className={fieldClassName}
      />
      <FieldError error={state.status === "error" ? state.message : undefined} />
      <SubmitButton isPending={isPending} label="Sign in" pendingLabel="Signing in…" />
    </form>
  );
}
