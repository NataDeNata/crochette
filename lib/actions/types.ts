export type FormActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  /**
   * What the visitor submitted, echoed back so the form can refill itself.
   *
   * React 19 resets an uncontrolled `<form action={…}>` once the action
   * returns — every time, including when it returns an error. So a form built
   * from `name` + `defaultValue` empties itself at exactly the moment the
   * visitor is being told to fix something, and they retype everything to
   * change one field. The fix is to feed `defaultValue` from here, which
   * changes the value React resets *to*.
   *
   * Only for genuinely uncontrolled forms; the admin forms drive their fields
   * through react-hook-form and keep their own values.
   */
  values?: Record<string, string>;
};

export const IDLE_STATE: FormActionState = { status: "idle" };

/** One wording for every rate-limited endpoint. Was copied verbatim into eight
 * actions, so a reword only ever landed in some of them. */
export const RATE_LIMITED_MESSAGE = "Too many attempts. Please wait a few minutes and try again.";

/** Paired with `fieldErrors`, which is where the specifics already are. */
export const INVALID_FIELDS_MESSAGE = "Please check the fields below.";

/** The rejection every rate-limited action returns. `rest` carries whatever the
 * caller echoes back — `values` on the storefront forms, nothing elsewhere. */
export function rateLimited(rest?: Partial<FormActionState>): FormActionState {
  return { status: "error", message: RATE_LIMITED_MESSAGE, ...rest };
}

/**
 * The rejection for a failed `safeParse`, built straight from the Zod error.
 *
 * Takes the error rather than the whole result so the call site stays inside
 * the `!parsed.success` narrowing and TypeScript keeps `parsed.data` typed on
 * the other branch.
 */
export function invalidFields(
  error: { flatten(): { fieldErrors: Record<string, string[]> } },
  rest?: Partial<FormActionState>
): FormActionState {
  return { status: "error", message: INVALID_FIELDS_MESSAGE, fieldErrors: error.flatten().fieldErrors, ...rest };
}

/** The same rejection when the problem was found by hand rather than by Zod. */
export function fieldError(field: string, message: string, rest?: Partial<FormActionState>): FormActionState {
  return { status: "error", message: INVALID_FIELDS_MESSAGE, fieldErrors: { [field]: [message] }, ...rest };
}
