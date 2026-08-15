/* Was a hardcoded oklch literal from the cream palette. `--destructive` is the
 * press red on the storefront and the admin's own red inside /admin, so one
 * token now covers both surfaces correctly. */
const errorClassName = "field-error text-[12.5px] text-destructive";

/**
 * A validation message, attached to the field it describes.
 *
 * `id` exists so the input can point at it with `aria-describedby`. Without
 * that link the message is just a nearby span: sighted users read it as
 * attached to the field above it, screen reader users get no association at
 * all.
 *
 * `role="alert"` because these appear in response to a submit, after focus has
 * already moved on. An error that is only rendered is an error a screen reader
 * user has to go hunting for.
 *
 * THIS DELIBERATELY DOES NOT ANIMATE ITS OWN REMOVAL. It used to enter and
 * exit through `AnimatePresence`, which holds the outgoing element mounted
 * until its exit animation finishes — so an error that had already been
 * answered stayed on screen for as long as that animation failed to complete.
 * Observed directly: after retracting a discount-code error, the input's
 * `aria-invalid` was correctly gone while the red message was still sitting
 * under it. An error message is a claim about the visitor's input, and a claim
 * that cannot be withdrawn is worse than one that appears without a flourish.
 * The CSS entrance below has no fill-mode, so nothing about whether this is
 * shown depends on an animation running. */
export function FieldError({ error, id }: { error?: string; id?: string }) {
  if (!error) return null;

  return (
    <span id={id} role="alert" className={errorClassName}>
      {error}
    </span>
  );
}
