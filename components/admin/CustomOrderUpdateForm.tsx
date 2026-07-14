"use client";

import { useActionState } from "react";
import { IDLE_STATE } from "@/lib/actions/types";
import { updateCustomOrder } from "@/app/admin/custom-orders/actions";
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
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={labelStyle} htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={status} style={inputStyle}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <FieldError error={fieldErrors.status?.[0]} />
      </div>

      <div>
        <label style={labelStyle} htmlFor="quotedPriceDollars">Quoted price (PHP, optional)</label>
        <input
          id="quotedPriceDollars"
          name="quotedPriceDollars"
          type="number"
          step="0.01"
          min="0"
          defaultValue={quotedPriceDollars}
          style={inputStyle}
        />
        <FieldError error={fieldErrors.quotedPriceDollars?.[0]} />
      </div>

      <div>
        <label style={labelStyle} htmlFor="adminNotes">Admin notes (internal only)</label>
        <textarea id="adminNotes" name="adminNotes" defaultValue={adminNotes} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
        <FieldError error={fieldErrors.adminNotes?.[0]} />
      </div>

      <FieldError error={state.status === "error" ? state.message : undefined} />
      {state.status === "success" && (
        <span style={{ fontSize: 12.5, color: "oklch(0.55 0.12 150)" }}>{state.message}</span>
      )}

      <SubmitButton isPending={isPending} label="Save" pendingLabel="Saving…" />
    </form>
  );
}
