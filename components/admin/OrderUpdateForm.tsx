"use client";

import { useActionState } from "react";
import { IDLE_STATE } from "@/lib/actions/types";
import { updateOrder } from "@/app/admin/orders/actions";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FORWARD_STATUSES = ["shipped", "completed", "cancelled"];

export function OrderUpdateForm({
  id,
  status,
  trackingNumber,
  carrier,
}: {
  id: string;
  status: string;
  trackingNumber: string | null;
  carrier: string | null;
}) {
  const action = updateOrder.bind(null, id);
  const [state, formAction, isPending] = useActionState(action, IDLE_STATE);
  const fieldErrors = state.fieldErrors ?? {};
  const defaultValue = FORWARD_STATUSES.includes(status) ? status : "shipped";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-[13px] text-muted-foreground" htmlFor="status">
          Fulfillment status
        </label>
        {(status === "pending" || status === "failed") && (
          <div className="mb-2 text-[13px] text-muted-foreground">
            Current status is <strong>{status}</strong>, set automatically by the payment flow, not editable here.
          </div>
        )}
        <Select name="status" defaultValue={defaultValue}>
          <SelectTrigger id="status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORWARD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError error={fieldErrors.status?.[0]} />
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] text-muted-foreground" htmlFor="carrier">
          Carrier (optional)
        </label>
        <Input id="carrier" name="carrier" defaultValue={carrier ?? ""} placeholder="e.g. J&T Express" />
        <FieldError error={fieldErrors.carrier?.[0]} />
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] text-muted-foreground" htmlFor="trackingNumber">
          Tracking number (optional)
        </label>
        <Input id="trackingNumber" name="trackingNumber" defaultValue={trackingNumber ?? ""} />
        <FieldError error={fieldErrors.trackingNumber?.[0]} />
      </div>

      <FieldError error={state.status === "error" ? state.message : undefined} />

      <SubmitButton isPending={isPending} label="Save" pendingLabel="Saving…" />
    </form>
  );
}
