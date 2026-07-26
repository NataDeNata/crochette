export type AccountSignupState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  /** Echoed back on error, same reset-on-re-render reasoning as
   * AccountLoginState/AdminLoginState — never echoes the password. */
  name?: string;
  email?: string;
};

export const IDLE_ACCOUNT_SIGNUP_STATE: AccountSignupState = { status: "idle" };
