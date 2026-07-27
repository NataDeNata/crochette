"use client";

import { useActionState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { submitCustomOrder } from "@/app/custom/actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { FormSuccessMessage } from "@/components/forms/FormSuccessMessage";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";

const inputClassName =
  "py-3.5 px-4.5 rounded-lg border-[1.5px] border-[oklch(0.75_0.03_20)] bg-card text-sm [font-family:inherit]";

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
          className="flex flex-col gap-3.5 max-w-[420px]"
        >
          <input type="hidden" name="pieceType" value="Quick request (via homepage)" />
          <input type="hidden" name="preferredSize" value="" />
          <input type="hidden" name="preferredColors" value="" />

          <motion.div layout className="flex flex-col gap-1.5">
            <input name="name" placeholder="Your name" className={inputClassName} />
            <FieldError error={fieldErrors.name?.[0]} />
          </motion.div>

          <motion.div layout className="flex flex-col gap-1.5">
            <input name="email" placeholder="Email address" type="email" className={inputClassName} />
            <FieldError error={fieldErrors.email?.[0]} />
          </motion.div>

          <motion.div layout className="flex flex-col gap-1.5">
            <textarea
              name="description"
              placeholder="Describe your dream piece..."
              rows={3}
              className={`${inputClassName} resize-y`}
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
