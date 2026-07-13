"use client";

import { useActionState } from "react";
import { submitCustomOrder } from "@/app/custom/actions";
import { IDLE_STATE } from "@/lib/actions/types";

const inputStyle = {
  padding: "14px 18px",
  borderRadius: 12,
  border: "1.5px solid oklch(0.75 0.03 20)",
  background: "oklch(0.98 0.01 85)",
  fontSize: 14,
  fontFamily: "inherit",
} as const;

const errorStyle = {
  fontSize: 12.5,
  color: "oklch(0.5 0.18 25)",
  marginTop: -8,
} as const;

export function CustomOrderForm() {
  const [state, formAction, isPending] = useActionState(submitCustomOrder, IDLE_STATE);

  if (state.status === "success") {
    return (
      <div
        style={{
          padding: 24,
          borderRadius: 16,
          background: "oklch(0.95 0.03 150)",
          color: "oklch(0.3 0.05 150)",
          fontSize: 15,
          lineHeight: 1.6,
        }}
      >
        {state.message}
      </div>
    );
  }

  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <input name="name" placeholder="Your name" style={inputStyle} />
      {fieldErrors.name && <span style={errorStyle}>{fieldErrors.name[0]}</span>}

      <input name="email" placeholder="Email address" type="email" style={inputStyle} />
      {fieldErrors.email && <span style={errorStyle}>{fieldErrors.email[0]}</span>}

      <div style={{ display: "flex", gap: 14 }}>
        <select name="pieceType" style={{ ...inputStyle, flex: 1, color: "oklch(0.4 0.02 60)" }} defaultValue="">
          <option value="" disabled>
            Piece type
          </option>
          <option>Amigurumi character</option>
          <option>Flower / bouquet</option>
          <option>Home decor</option>
          <option>Something else</option>
        </select>
        <input name="preferredSize" placeholder="Preferred size" style={{ ...inputStyle, flex: 1 }} />
      </div>
      {fieldErrors.pieceType && <span style={errorStyle}>{fieldErrors.pieceType[0]}</span>}

      <input name="preferredColors" placeholder="Preferred colors" style={inputStyle} />

      <textarea
        name="description"
        placeholder="Describe your dream piece..."
        rows={4}
        style={{ ...inputStyle, resize: "vertical" }}
      />
      {fieldErrors.description && <span style={errorStyle}>{fieldErrors.description[0]}</span>}

      {state.status === "error" && state.message && (
        <span style={{ ...errorStyle, marginTop: 0 }}>{state.message}</span>
      )}

      <button
        type="submit"
        disabled={isPending}
        style={{
          alignSelf: "flex-start",
          background: "oklch(0.28 0.02 60)",
          color: "oklch(0.98 0.01 85)",
          border: "none",
          padding: "14px 30px",
          borderRadius: 30,
          fontSize: 14,
          fontWeight: 500,
          cursor: isPending ? "default" : "pointer",
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
