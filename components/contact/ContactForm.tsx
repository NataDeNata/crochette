"use client";

import { useActionState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { submitContactMessage } from "@/app/contact/actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { FormSuccessMessage } from "@/components/forms/FormSuccessMessage";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FieldError } from "@/components/forms/FieldError";
import { Input } from "@/components/ui/input";
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
          <motion.div layout className="flex flex-col gap-1.5">
            <Input name="name" placeholder="Your name" className={fieldClassName} />
            <FieldError error={fieldErrors.name?.[0]} />
          </motion.div>

          <motion.div layout className="flex flex-col gap-1.5">
            <Input name="email" placeholder="Email address" type="email" className={fieldClassName} />
            <FieldError error={fieldErrors.email?.[0]} />
          </motion.div>

          <Input name="subject" placeholder="Subject" className={fieldClassName} />

          <motion.div layout className="flex flex-col gap-1.5">
            <Textarea name="message" placeholder="Your message..." rows={5} className={`${fieldClassName} resize-y`} />
            <FieldError error={fieldErrors.message?.[0]} />
          </motion.div>

          <FieldError error={state.status === "error" ? state.message : undefined} />

          <SubmitButton isPending={isPending} label="Send message" pendingLabel="Sending…" />
        </motion.form>
      )}
    </AnimatePresence>
  );
}
