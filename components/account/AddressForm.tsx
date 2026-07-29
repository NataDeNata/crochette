"use client";

import { useActionState, useEffect } from "react";
import { saveAddress } from "@/app/account/addresses/actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";
import { Input } from "@/components/ui/input";
import type { AddressRow } from "@/lib/db/schema";

const fieldClassName =
  "h-auto rounded-xl border-[1.5px] border-[oklch(0.75_0.03_20)] bg-[oklch(0.98_0.01_85)] px-[14px] py-3 text-sm";

export function AddressForm({ address, onSaved }: { address?: AddressRow; onSaved?: () => void }) {
  const [state, formAction, isPending] = useActionState(saveAddress, IDLE_STATE);
  const fieldErrors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === "success") onSaved?.();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {address && <input type="hidden" name="addressId" value={address.id} />}

      <Input name="label" placeholder="Label (e.g. Home) — optional" defaultValue={address?.label ?? ""} className={fieldClassName} />

      <div className="flex flex-col gap-1.5">
        <Input name="line1" placeholder="Street address" defaultValue={address?.line1} className={fieldClassName} />
        <FieldError error={fieldErrors.line1?.[0]} />
      </div>

      <Input name="line2" placeholder="Apartment, suite, etc. (optional)" defaultValue={address?.line2 ?? ""} className={fieldClassName} />

      <div className="flex flex-col gap-1.5">
        <Input name="city" placeholder="City" defaultValue={address?.city} className={fieldClassName} />
        <FieldError error={fieldErrors.city?.[0]} />
      </div>

      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <Input name="province" placeholder="Province" defaultValue={address?.province} className={fieldClassName} />
          <FieldError error={fieldErrors.province?.[0]} />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Input name="postalCode" placeholder="Postal code" defaultValue={address?.postalCode} className={fieldClassName} />
          <FieldError error={fieldErrors.postalCode?.[0]} />
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
