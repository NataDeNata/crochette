"use client";

import { useActionState, useRef, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { submitCustomOrder } from "@/app/custom/actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { FormSuccessMessage } from "@/components/forms/FormSuccessMessage";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";
import { PillGroup } from "@/components/ui/PillGroup";
import { ColorSwatchPicker } from "@/components/custom/ColorSwatchPicker";
import { SizePicker } from "@/components/custom/SizePicker";
import { PhotoAttach } from "@/components/custom/PhotoAttach";
import { EMPTY_PREVIEW, type PreviewData } from "@/components/custom/LiveRequestPreview";

const inputStyle = {
  padding: "14px 18px",
  borderRadius: 12,
  border: "1.5px solid oklch(0.75 0.03 20)",
  background: "oklch(0.98 0.01 85)",
  fontSize: 14,
  fontFamily: "inherit",
} as const;

const PIECE_TYPES = [
  { value: "Amigurumi character", label: "Amigurumi character" },
  { value: "Flower / bouquet", label: "Flower / bouquet" },
  { value: "Home decor", label: "Home decor" },
  { value: "Something else", label: "Something else" },
];

const BUDGET_RANGES = [
  { value: "Under $50", label: "Under $50" },
  { value: "$50–120", label: "$50–120" },
  { value: "$120+", label: "$120+" },
  { value: "Not sure", label: "Not sure" },
];

export function CustomOrderForm({
  onPreviewChange,
}: {
  /** Called with the live field values as the customer fills the form —
   * consumed by CustomOrderPanel to drive LiveRequestPreview. */
  onPreviewChange?: (preview: PreviewData) => void;
}) {
  const [state, formAction, isPending] = useActionState(submitCustomOrder, IDLE_STATE);
  const fieldErrors = state.fieldErrors ?? {};
  // A ref, not state: this form doesn't render the preview itself, it just
  // accumulates it and forwards to the parent's setState. Calling
  // onPreviewChange from inside a setState updater here would update
  // CustomOrderPanel while CustomOrderForm is rendering — React rightly
  // rejects that, so we track the running value in a ref instead and call
  // onPreviewChange from the event handlers directly.
  const previewRef = useRef<PreviewData>(EMPTY_PREVIEW);

  function updatePreview(patch: Partial<PreviewData>) {
    previewRef.current = { ...previewRef.current, ...patch };
    onPreviewChange?.(previewRef.current);
  }

  // The description textarea bubbles a native change event up to the form.
  // Every other field (pill/swatch/size pickers) sets its hidden input's
  // value programmatically (no real DOM change event), so those call
  // updatePreview directly via onValueChange instead — see below.
  function handleFormChange(e: ChangeEvent<HTMLFormElement>) {
    const { name, value } = e.target;
    if (name === "description") {
      updatePreview({ description: value });
    }
  }

  return (
    <AnimatePresence mode="wait">
      {state.status === "success" ? (
        <FormSuccessMessage key="success" message={state.message} />
      ) : (
        <motion.form
          key="form"
          action={formAction}
          onChange={handleFormChange}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <motion.div layout style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input name="name" placeholder="Your name" style={inputStyle} />
            <FieldError error={fieldErrors.name?.[0]} />
          </motion.div>

          <motion.div layout style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input name="email" placeholder="Email address" type="email" style={inputStyle} />
            <FieldError error={fieldErrors.email?.[0]} />
          </motion.div>

          <motion.div layout style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <PillGroup
              name="pieceType"
              options={PIECE_TYPES}
              layoutId="custom-piece-type"
              ariaLabel="Piece type"
              onValueChange={(v) => updatePreview({ pieceType: v })}
            />
            <SizePicker name="preferredSize" onValueChange={(v) => updatePreview({ preferredSize: v })} />
            <FieldError error={fieldErrors.pieceType?.[0]} />
          </motion.div>

          <motion.div layout style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <ColorSwatchPicker name="preferredColors" onValueChange={(v) => updatePreview({ preferredColors: v })} />
          </motion.div>

          <motion.div layout style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12.5, color: "oklch(0.45 0.02 60)" }}>Budget range (optional)</div>
            <PillGroup name="budgetRange" options={BUDGET_RANGES} layoutId="custom-budget" ariaLabel="Budget range" />
          </motion.div>

          <motion.div layout style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <textarea
              name="description"
              placeholder="Describe your dream piece..."
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <FieldError error={fieldErrors.description?.[0]} />
          </motion.div>

          <motion.div layout style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <PhotoAttach name="photos" onValueChange={(urls) => updatePreview({ photoPreviewUrls: urls })} />
            <FieldError error={fieldErrors.photos?.[0]} />
          </motion.div>

          <FieldError error={state.status === "error" ? state.message : undefined} />

          <SubmitButton isPending={isPending} label="Send request" pendingLabel="Sending…" />
        </motion.form>
      )}
    </AnimatePresence>
  );
}
