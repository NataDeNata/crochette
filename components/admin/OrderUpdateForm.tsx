"use client";

import { useActionState } from "react";
import { IDLE_STATE } from "@/lib/actions/types";
import { updateOrder } from "@/app/admin/orders/actions";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";

const inputStyle = {
  padding: "12px 16px",
  borderRadius: 10,
  border: "1.5px solid oklch(0.85 0.02 60)",
  background: "oklch(1 0 0)",
  fontSize: 14,
  fontFamily: "inherit",
  width: "100%",
} as const;

const labelStyle = { fontSize: 12.5, color: "oklch(0.45 0.02 60)", marginBottom: 6, display: "block" } as const;

const FORWARD_STATUSES = ["shipped", "completed", "cancelled"];

export function OrderUpdateForm({ id, status }: { id: string; status: string }) {
  const action = updateOrder.bind(null, id);
  const [state, formAction, isPending] = useActionState(action, IDLE_STATE);
  const fieldErrors = state.fieldErrors ?? {};
  const defaultValue = FORWARD_STATUSES.includes(status) ? status : "shipped";

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={labelStyle} htmlFor="status">
          Fulfillment status
        </label>
        {(status === "pending" || status === "failed") && (
          <div style={{ fontSize: 12, color: "oklch(0.5 0.02 60)", marginBottom: 8 }}>
            Current status is <strong>{status}</strong> — set automatically by the payment flow, not editable here.
          </div>
        )}
        <select id="status" name="status" defaultValue={defaultValue} style={inputStyle}>
          {FORWARD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <FieldError error={fieldErrors.status?.[0]} />
      </div>

      <FieldError error={state.status === "error" ? state.message : undefined} />
      {state.status === "success" && (
        <span style={{ fontSize: 12.5, color: "oklch(0.55 0.12 150)" }}>{state.message}</span>
      )}

      <SubmitButton isPending={isPending} label="Save" pendingLabel="Saving…" />
    </form>
  );
}
