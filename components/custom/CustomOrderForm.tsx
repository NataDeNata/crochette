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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const fieldClassName =
  "h-auto rounded-none border-2 border-keyline bg-sheet px-4 py-3.5 text-sm text-keyline placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red";

const PIECE_TYPES = [
  { value: "Amigurumi character", label: "Amigurumi character" },
  { value: "Flower / bouquet", label: "Flower / bouquet" },
  { value: "Home decor", label: "Home decor" },
  { value: "Something else", label: "Something else" },
];

/* Pesos, and bands that mean something against this catalogue (₱380–₱1,200).
 *
 * These were "Under $50 / $50–120 / $120+" — US dollars, on a store that
 * prices every piece in pesos. At current rates $50 is roughly ₱2,800, so a
 * customer choosing "under $50" and a studio owner reading it as ₱50 were
 * describing budgets two orders of magnitude apart, in the one field the
 * quoting conversation starts from.
 *
 * `budgetRange` is free text end to end — `z.string().max(60)`, a nullable
 * `text` column, and a plain echo in the admin views and both emails — so
 * this is the only place the bands are named. Requests already submitted keep
 * their dollar strings, which is correct: they record what that customer
 * actually chose. */
const BUDGET_RANGES = [
  { value: "Under ₱800", label: "Under ₱800" },
  { value: "₱800–2,000", label: "₱800–2,000" },
  { value: "₱2,000+", label: "₱2,000+" },
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

          <motion.div layout className="flex flex-col gap-2">
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

          <motion.div layout className="flex flex-col gap-2">
            {/* Every sibling control here announces what it is asking for and
                this one didn't — the swatches carry their own names, but a
                row of five coloured squares with no heading leaves both a
                screen reader user and a sighted one guessing which decision
                they belong to. */}
            <div className="type-sheet-spec text-keyline/60">Colours (optional)</div>
            <ColorSwatchPicker name="preferredColors" onValueChange={(v) => updatePreview({ preferredColors: v })} />
          </motion.div>

          <motion.div layout className="flex flex-col gap-2">
            <div className="type-sheet-spec text-keyline/60">Budget range (optional)</div>
            <PillGroup name="budgetRange" options={BUDGET_RANGES} layoutId="custom-budget" ariaLabel="Budget range" />
          </motion.div>

          <motion.div layout className="flex flex-col gap-1.5">
            <Textarea
              name="description"
              placeholder="Describe your dream piece..."
              rows={4}
              className={`${fieldClassName} resize-y`}
            />
            <FieldError error={fieldErrors.description?.[0]} />
          </motion.div>

          <motion.div layout className="flex flex-col gap-1.5">
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
