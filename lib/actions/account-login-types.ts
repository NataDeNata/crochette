export type AccountLoginState = {
  status: "idle" | "error";
  message?: string;
  /** Echoed back on error so the form can restore it — same reset-on-
   * re-render issue as AdminLoginState (see lib/actions/admin-login-types.ts). */
  email?: string;
};

export const IDLE_ACCOUNT_LOGIN_STATE: AccountLoginState = { status: "idle" };
