export type AdminLoginState = {
  status: "idle" | "error";
  message?: string;
  /** Echoed back on error so the form can restore it — the Server Action
   * round-trip re-renders AdminLoginPage from scratch, which resets the
   * (uncontrolled) email input's DOM value along with it. */
  email?: string;
};

export const IDLE_LOGIN_STATE: AdminLoginState = { status: "idle" };
