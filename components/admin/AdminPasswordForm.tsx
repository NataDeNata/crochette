"use client";

import { useActionState } from "react";
import { changeAdminPassword } from "@/app/admin/settings/actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { ADMIN_PASSWORD_MIN } from "@/lib/validation/admin-account";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";
import { Input } from "@/components/ui/input";

export function AdminPasswordForm() {
  const [state, formAction, isPending] = useActionState(changeAdminPassword, IDLE_STATE);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-[13px] text-muted-foreground" htmlFor="currentPassword">
          Current password
        </label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" />
        <FieldError error={fieldErrors.currentPassword?.[0]} />
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] text-muted-foreground" htmlFor="newPassword">
          New password
        </label>
        {/* `minLength` mirrors the Zod rule rather than replacing it — the
            server re-checks, since a Server Function is reachable by direct
            POST. This only saves a round-trip. */}
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={ADMIN_PASSWORD_MIN}
        />
        <FieldError error={fieldErrors.newPassword?.[0]} />
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] text-muted-foreground" htmlFor="confirmPassword">
          Confirm new password
        </label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" />
        <FieldError error={fieldErrors.confirmPassword?.[0]} />
      </div>

      <FieldError error={state.status === "error" ? state.message : undefined} />

      <SubmitButton isPending={isPending} label="Change password" pendingLabel="Changing…" />
    </form>
  );
}
