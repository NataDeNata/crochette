"use client";

import { useActionState } from "react";
import { IDLE_STATE } from "@/lib/actions/types";
import { updateOrder } from "@/app/admin/orders/actions";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FORWARD_STATUSES = ["shipped", "completed", "cancelled"];

export function OrderUpdateForm({ id, status }: { id: string; status: string }) {
  const action = updateOrder.bind(null, id);
  const [state, formAction, isPending] = useActionState(action, IDLE_STATE);
  const fieldErrors = state.fieldErrors ?? {};
  const defaultValue = FORWARD_STATUSES.includes(status) ? status : "shipped";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-xs text-muted-foreground" htmlFor="status">
          Fulfillment status
        </label>
        {(status === "pending" || status === "failed") && (
          <div className="mb-2 text-xs text-muted-foreground">
            Current status is <strong>{status}</strong> — set automatically by the payment flow, not editable here.
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

      <FieldError error={state.status === "error" ? state.message : undefined} />
      {state.status === "success" && (
        <span className="text-xs text-[oklch(0.55_0.12_150)]">{state.message}</span>
      )}

      <SubmitButton isPending={isPending} label="Save" pendingLabel="Saving…" />
    </form>
  );
}
