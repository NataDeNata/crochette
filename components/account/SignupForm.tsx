"use client";

import { useActionState } from "react";
import { signupAccount } from "@/app/account/signup/actions";
import { IDLE_ACCOUNT_SIGNUP_STATE } from "@/lib/actions/auth-form-types";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";
import { Input } from "@/components/ui/input";

const fieldClassName =
  "h-auto rounded-xl border-[1.5px] border-input bg-[oklch(0.98_0.01_85)] px-[18px] py-3.5 text-sm";

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signupAccount, IDLE_ACCOUNT_SIGNUP_STATE);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1.5">
        <Input name="name" placeholder="Full name" defaultValue={state.name} className={fieldClassName} />
        <FieldError error={fieldErrors.name?.[0]} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Input
          name="email"
          type="email"
          placeholder="Email address"
          autoComplete="username"
          defaultValue={state.email}
          className={fieldClassName}
        />
        <FieldError error={fieldErrors.email?.[0]} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Input
          name="password"
          type="password"
          placeholder="Password"
          autoComplete="new-password"
          className={fieldClassName}
        />
        <FieldError error={fieldErrors.password?.[0]} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Input
          name="confirmPassword"
          type="password"
          placeholder="Confirm password"
          autoComplete="new-password"
          className={fieldClassName}
        />
        <FieldError error={fieldErrors.confirmPassword?.[0]} />
      </div>
      <FieldError error={state.status === "error" && !Object.keys(fieldErrors).length ? state.message : undefined} />
      <SubmitButton isPending={isPending} label="Create account" pendingLabel="Creating account…" />
    </form>
  );
}
