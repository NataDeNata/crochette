"use client";

import { useActionState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { submitContactMessage } from "@/app/contact/actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { FormSuccessMessage } from "@/components/forms/FormSuccessMessage";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";
import { TextField } from "@/components/forms/TextField";
import { Textarea } from "@/components/ui/textarea";

const fieldClassName =
  "h-auto rounded-none border-2 border-keyline bg-sheet px-4 py-3.5 text-sm text-keyline placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red";

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContactMessage, IDLE_STATE);
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
          className="flex flex-col gap-3.5"
        >
          <motion.div layout>
            <TextField
              id="contact-name"
              name="name"
              label="Your name"
              autoComplete="name"
              required
              className={fieldClassName}
              error={fieldErrors.name?.[0]}
            />
          </motion.div>

          <motion.div layout>
            <TextField
              id="contact-email"
              name="email"
              label="Email address"
              type="email"
              autoComplete="email"
              required
              className={fieldClassName}
              error={fieldErrors.email?.[0]}
            />
          </motion.div>

          <TextField
            id="contact-subject"
            name="subject"
            label="Subject (optional)"
            className={fieldClassName}
          />

          <motion.div layout className="flex flex-col gap-1.5">
            <label htmlFor="contact-message" className="type-sheet-spec text-keyline/60">
              Your message
            </label>
            <Textarea
              id="contact-message"
              name="message"
              rows={5}
              required
              aria-invalid={fieldErrors.message?.[0] ? true : undefined}
              aria-describedby={fieldErrors.message?.[0] ? "contact-message-error" : undefined}
              className={`${fieldClassName} resize-y`}
            />
            <FieldError id="contact-message-error" error={fieldErrors.message?.[0]} />
          </motion.div>

          <FieldError error={state.status === "error" ? state.message : undefined} />

          <SubmitButton isPending={isPending} label="Send message" pendingLabel="Sending…" />
        </motion.form>
      )}
    </AnimatePresence>
  );
}
