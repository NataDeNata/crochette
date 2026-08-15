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
