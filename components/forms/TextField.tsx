"use client";

import type { ComponentProps } from "react";
import { FieldError } from "@/components/forms/FieldError";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * A labelled storefront input, wired to its own error message.
 *
 * The storefront forms used to be bare `<Input name placeholder>` — no `id`,
 * no label, no `autoComplete`, no `aria-invalid`. Three separate costs, and
 * the third is the one that shows up in the funnel: with no `autoComplete` the
 * browser cannot fill an address it already knows, so every shopper types nine
 * fields by hand at the last step before paying.
 *
 * The label is visible rather than `sr-only`. A placeholder is not a label —
 * it disappears the moment there is a value, so the one time you most want to
 * know which field you are in (checking your own address before paying) is
 * exactly when the name is gone.
 *
 * `onClear` is how an error retracts. These inputs are uncontrolled and their
 * errors arrive from a Server Action, so without it nothing in the form knows
 * a field has been corrected until the next submit.
 */
export function TextField({
  id,
  label,
  error,
  onClear,
  className,
  labelClassName,
  ...inputProps
}: {
  id: string;
  label: string;
  error?: string;
  onClear?: () => void;
  labelClassName?: string;
} & ComponentProps<typeof Input>) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={cn("type-sheet-spec text-keyline/60", labelClassName)}>
        {label}
      </label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onInput={onClear}
        className={className}
        {...inputProps}
      />
      <FieldError id={errorId} error={error} />
    </div>
  );
}
