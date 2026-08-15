/**
 * Result shapes for the three credentials forms.
 *
 * Separate from `FormActionState` because these echo *named* fields rather than
 * a `values` bag: the password must never come back, so the set of fields that
 * may is fixed per form and worth naming in the type. They share this file
 * rather than one each — the three were byte-for-byte alike apart from the
 * echoed field names, and a note in one that pointed at another.
 *
 * All echo on error for the same reason: a Server Action round trip re-renders
 * the page, which resets the uncontrolled inputs' DOM values along with it.
 */

export type AccountLoginState = {
  status: "idle" | "error";
  message?: string;
  email?: string;
};

export type AccountSignupState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  name?: string;
  email?: string;
};

export type AdminLoginState = {
  /** `totp` means the password was accepted and a second factor is now
   * required — the form swaps to the code field on this and on nothing else.
   * It is only ever returned after a correct password, so it tells an attacker
   * who does not have one nothing about whether an account exists. */
  status: "idle" | "error" | "totp";
  message?: string;
  email?: string;
};

export const IDLE_ACCOUNT_LOGIN_STATE: AccountLoginState = { status: "idle" };
export const IDLE_ACCOUNT_SIGNUP_STATE: AccountSignupState = { status: "idle" };
export const IDLE_LOGIN_STATE: AdminLoginState = { status: "idle" };
