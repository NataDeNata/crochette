"use client";

import { useActionState, useEffect, useId, type ComponentProps } from "react";
import { saveAddress } from "@/app/account/addresses/actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";
import { TextField } from "@/components/forms/TextField";
import type { AddressRow } from "@/lib/db/schema";

const fieldClassName =
  "h-auto rounded-xl border-[1.5px] border-input bg-card px-[14px] py-3 text-sm";

function Field(props: ComponentProps<typeof TextField>) {
  return <TextField {...props} className={fieldClassName} />;
}

export function AddressForm({ address, onSaved }: { address?: AddressRow; onSaved?: () => void }) {
  const [state, formAction, isPending] = useActionState(saveAddress, IDLE_STATE);
  const fieldErrors = state.fieldErrors ?? {};
  // The addresses page renders one of these per saved address plus one to add
  // a new one, so the ids the labels point at have to be per-instance.
  const formId = useId();

  useEffect(() => {
    if (state.status === "success") onSaved?.();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {address && <input type="hidden" name="addressId" value={address.id} />}

      <Field
        id={`${formId}-label`}
        name="label"
        label="Label (e.g. Home), optional"
        defaultValue={address?.label ?? ""}
      />

      <Field
        id={`${formId}-line1`}
        name="line1"
        label="Street address"
        autoComplete="address-line1"
        required
        defaultValue={address?.line1}
        error={fieldErrors.line1?.[0]}
      />

      <Field
        id={`${formId}-line2`}
        name="line2"
        label="Apartment, suite, etc. (optional)"
        autoComplete="address-line2"
        defaultValue={address?.line2 ?? ""}
      />

      <Field
        id={`${formId}-city`}
        name="city"
        label="City"
        autoComplete="address-level2"
        required
        defaultValue={address?.city}
        error={fieldErrors.city?.[0]}
      />

      <div className="flex gap-2">
        <div className="flex-1">
          <Field
            id={`${formId}-province`}
            name="province"
            label="Province"
            autoComplete="address-level1"
            required
            defaultValue={address?.province}
            error={fieldErrors.province?.[0]}
          />
        </div>
        <div className="flex-1">
          <Field
            id={`${formId}-postal`}
            name="postalCode"
            label="Postal code"
            autoComplete="postal-code"
            inputMode="numeric"
            required
            defaultValue={address?.postalCode}
            error={fieldErrors.postalCode?.[0]}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" name="isDefault" defaultChecked={address?.isDefault} />
        Set as default address
      </label>

      <FieldError error={state.status === "error" ? state.message : undefined} />

      <SubmitButton isPending={isPending} label={address ? "Save changes" : "Add address"} pendingLabel="Saving…" />
    </form>
  );
}
