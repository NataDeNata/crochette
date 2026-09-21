"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/account/forgot-password/actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";
import { Input } from "@/components/ui/input";

const fieldClassName =
  "h-auto rounded-xl border-[1.5px] border-input bg-card px-[18px] py-3.5 text-sm";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, IDLE_STATE);

  // The form is replaced by its own answer rather than sitting under it. The
  // answer is the same for every address, so leaving the field in place invites
  // a second try at a form that will say exactly this again.
  if (state.status === "success") {
    return (
      <p role="status" className="text-[13.5px] text-muted-foreground leading-[1.65] text-center">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <Input
        name="email"
        type="email"
        placeholder="Email address"
        autoComplete="username"
        aria-describedby="forgot-email-error"
        defaultValue={state.values?.email}
        className={fieldClassName}
      />
      <FieldError id="forgot-email-error" error={state.fieldErrors?.email?.[0] ?? state.message} />
      <SubmitButton isPending={isPending} label="Send reset link" pendingLabel="Sending…" />
    </form>
  );
}
