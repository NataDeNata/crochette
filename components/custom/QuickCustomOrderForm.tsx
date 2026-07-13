"use client";

import { useActionState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { submitCustomOrder } from "@/app/custom/actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { FormSuccessMessage } from "@/components/forms/FormSuccessMessage";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";

const inputStyle = {
  padding: "14px 18px",
  borderRadius: 12,
  border: "1.5px solid oklch(0.75 0.03 20)",
  background: "oklch(0.98 0.01 85)",
  fontSize: 14,
  fontFamily: "inherit",
} as const;

/** Compact 3-field teaser version of CustomOrderForm, embedded on the home page. */
export function QuickCustomOrderForm() {
  const [state, formAction, isPending] = useActionState(submitCustomOrder, IDLE_STATE);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <AnimatePresence mode="wait">
      {state.status === "success" ? (
        <FormSuccessMessage key="success" message={state.message} />
      ) : (
        <motion.form
          key="form"
          action={formAction}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 420 }}
        >
          <input type="hidden" name="pieceType" value="Quick request (via homepage)" />
          <input type="hidden" name="preferredSize" value="" />
          <input type="hidden" name="preferredColors" value="" />

          <motion.div layout style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input name="name" placeholder="Your name" style={inputStyle} />
            <FieldError error={fieldErrors.name?.[0]} />
          </motion.div>

          <motion.div layout style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input name="email" placeholder="Email address" type="email" style={inputStyle} />
            <FieldError error={fieldErrors.email?.[0]} />
          </motion.div>

          <motion.div layout style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <textarea
              name="description"
              placeholder="Describe your dream piece..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <FieldError error={fieldErrors.description?.[0]} />
          </motion.div>

          <FieldError error={state.status === "error" ? state.message : undefined} />

          <SubmitButton isPending={isPending} label="Send request" pendingLabel="Sending…" />
        </motion.form>
      )}
    </AnimatePresence>
  );
}
