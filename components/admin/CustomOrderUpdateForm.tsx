"use client";

import { useActionState } from "react";
import { IDLE_STATE } from "@/lib/actions/types";
import { updateCustomOrder } from "@/app/admin/custom-orders/actions";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUSES = ["new", "quoted", "accepted", "in_production", "shipped", "completed", "declined"];

export function CustomOrderUpdateForm({
  id,
  status,
  quotedPriceDollars,
  adminNotes,
}: {
  id: string;
  status: string;
  quotedPriceDollars: string;
  adminNotes: string;
}) {
  const action = updateCustomOrder.bind(null, id);
  const [state, formAction, isPending] = useActionState(action, IDLE_STATE);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-xs text-muted-foreground" htmlFor="status">
          Status
        </label>
        <Select name="status" defaultValue={status}>
          <SelectTrigger id="status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError error={fieldErrors.status?.[0]} />
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-muted-foreground" htmlFor="quotedPriceDollars">
          Quoted price (₱, optional)
        </label>
        <Input
          id="quotedPriceDollars"
          name="quotedPriceDollars"
          type="number"
          step="0.01"
          min="0"
          defaultValue={quotedPriceDollars}
        />
        <FieldError error={fieldErrors.quotedPriceDollars?.[0]} />
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-muted-foreground" htmlFor="adminNotes">
          Admin notes (internal only)
        </label>
        <Textarea id="adminNotes" name="adminNotes" defaultValue={adminNotes} rows={4} />
        <FieldError error={fieldErrors.adminNotes?.[0]} />
      </div>

      <FieldError error={state.status === "error" ? state.message : undefined} />
      {state.status === "success" && (
        <span className="text-xs text-[oklch(0.55_0.12_150)]">{state.message}</span>
      )}

      <SubmitButton isPending={isPending} label="Save" pendingLabel="Saving…" />
    </form>
  );
}
