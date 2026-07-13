"use client";

import { useActionState } from "react";
import { IDLE_STATE, type FormActionState } from "@/lib/actions/types";
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

export type ProductFormDefaults = {
  name: string;
  slug: string;
  description: string;
  priceDollars: string;
  category: string;
  tag: string;
  status: string;
  stockQty: string;
};

export function ProductForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (prevState: FormActionState, formData: FormData) => Promise<FormActionState>;
  defaults?: ProductFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, IDLE_STATE);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
      <div>
        <label style={labelStyle} htmlFor="name">Name</label>
        <input id="name" name="name" defaultValue={defaults?.name} style={inputStyle} />
        <FieldError error={fieldErrors.name?.[0]} />
      </div>

      <div>
        <label style={labelStyle} htmlFor="slug">Slug (used in the product URL)</label>
        <input id="slug" name="slug" defaultValue={defaults?.slug} placeholder="e.g. milo-the-bear" style={inputStyle} />
        <FieldError error={fieldErrors.slug?.[0]} />
      </div>

      <div>
        <label style={labelStyle} htmlFor="description">Description</label>
        <textarea id="description" name="description" defaultValue={defaults?.description} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
        <FieldError error={fieldErrors.description?.[0]} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="priceDollars">Price (USD)</label>
          <input id="priceDollars" name="priceDollars" type="number" step="0.01" min="0.01" defaultValue={defaults?.priceDollars} style={inputStyle} />
          <FieldError error={fieldErrors.priceDollars?.[0]} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="stockQty">Stock quantity</label>
          <input id="stockQty" name="stockQty" type="number" step="1" min="0" defaultValue={defaults?.stockQty ?? "0"} style={inputStyle} />
          <FieldError error={fieldErrors.stockQty?.[0]} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="category">Category</label>
          <select id="category" name="category" defaultValue={defaults?.category ?? "amigurumi"} style={inputStyle}>
            <option value="amigurumi">Amigurumi</option>
            <option value="flowers">Flowers</option>
            <option value="home-decor">Home decor</option>
            <option value="baskets">Baskets</option>
          </select>
          <FieldError error={fieldErrors.category?.[0]} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={defaults?.status ?? "active"} style={inputStyle}>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="sold_out">Sold out</option>
          </select>
          <FieldError error={fieldErrors.status?.[0]} />
        </div>
      </div>

      <div>
        <label style={labelStyle} htmlFor="tag">Tag (optional — e.g. &quot;New&quot;, &quot;Bestseller&quot;)</label>
        <input id="tag" name="tag" defaultValue={defaults?.tag} style={inputStyle} />
        <FieldError error={fieldErrors.tag?.[0]} />
      </div>

      <FieldError error={state.status === "error" ? state.message : undefined} />

      <SubmitButton isPending={isPending} label={submitLabel} pendingLabel="Saving…" />
    </form>
  );
}
