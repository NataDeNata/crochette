export type AdminLoginState = {
  /** `totp` means the password was accepted and a second factor is now
   * required — the form swaps to the code field on this and on nothing else.
   * It is only ever returned after a correct password, so it tells an attacker
   * who does not have one nothing about whether an account exists. */
  status: "idle" | "error" | "totp";
  message?: string;
  /** Echoed back on error so the form can restore it — the Server Action
   * round-trip re-renders AdminLoginPage from scratch, which resets the
   * (uncontrolled) email input's DOM value along with it. */
  email?: string;
};

export const IDLE_LOGIN_STATE: AdminLoginState = { status: "idle" };
