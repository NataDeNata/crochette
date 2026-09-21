"use client";

import { useActionState } from "react";
import { completePasswordReset } from "@/app/account/reset-password/actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";
import { Input } from "@/components/ui/input";

const fieldClassName =
  "h-auto rounded-xl border-[1.5px] border-input bg-card px-[18px] py-3.5 text-sm";

/** The token rides in a hidden field rather than being read from the URL by the
 * action: a Server Action has no access to the page's query string, and passing
 * it through the form keeps the action a pure function of its input — which is
 * what lets a test drive it without a router. */
export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(completePasswordReset, IDLE_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <input type="hidden" name="token" value={token} />
      <Input
        name="password"
        type="password"
        placeholder="New password"
        autoComplete="new-password"
        aria-describedby="reset-password-error"
        className={fieldClassName}
      />
      <FieldError id="reset-password-error" error={state.fieldErrors?.password?.[0]} />
      <Input
        name="confirmPassword"
        type="password"
        placeholder="Confirm new password"
        autoComplete="new-password"
        aria-describedby="reset-confirm-error"
        className={fieldClassName}
      />
      <FieldError id="reset-confirm-error" error={state.fieldErrors?.confirmPassword?.[0]} />
      {/* The form-level message: a dead link, or a reset that landed but whose
          convenience sign-in didn't. Both need saying somewhere that isn't
          attached to a field. */}
      <FieldError error={state.status === "error" && !state.fieldErrors ? state.message : undefined} />
      <SubmitButton isPending={isPending} label="Set new password" pendingLabel="Saving…" />
    </form>
  );
}
