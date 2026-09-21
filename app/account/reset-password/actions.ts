"use server";

import { after } from "next/server";
import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { notifyPasswordChanged } from "@/lib/email/notifications";
import { signIn } from "@/lib/auth";
import { findCustomerById, setCustomerPassword } from "@/lib/db/accounts";
import { resetPasswordSchema } from "@/lib/validation/account";
import { verifyPasswordResetToken } from "@/lib/security/account-token";
import { invalidFields, type FormActionState } from "@/lib/actions/types";
import { logInfo } from "@/lib/observability/log";

/** One wording for every way the link can be dead — expired, forged, already
 * spent, superseded by a later request, or pointing at an account that no
 * longer exists. Telling them apart would be telling an attacker which of those
 * they achieved, and none of the five leads the shopper anywhere different: ask
 * for a new link. */
const DEAD_LINK_MESSAGE = "This reset link has expired or has already been used. Please request a new one.";

/**
 * Complete a password reset.
 *
 * No rate limit, and that is deliberate rather than an omission. There is
 * nothing here to guess: the token is a 256-bit HMAC, so an attacker who can
 * reach this action without one is not going to find it by trying, and one who
 * *has* one does not need to. The limit belongs on the request form, which is
 * what actually sends mail, and it is there.
 *
 * **The single-use property is the token's, not this function's.** The link is
 * signed against the account's `password_changed_at` as it stood when the mail
 * went out; `setCustomerPassword` advances that stamp in the same statement
 * that writes the hash. So the token just spent stops verifying at the instant
 * the reset lands, along with every other outstanding link for that account —
 * with nothing stored, nothing to clean up, and no window in which two of them
 * are live.
 */
export async function completePasswordReset(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const token = formData.get("token");
  if (typeof token !== "string" || !token) {
    return { status: "error", message: DEAD_LINK_MESSAGE };
  }

  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  // Checked before the token, so a shopper who mistypes the confirmation is
  // told about *that* rather than being sent back for a fresh link. The token
  // is still checked below, and the password is not written until it passes.
  if (!parsed.success) return invalidFields(parsed.error);

  const opened = verifyPasswordResetToken(token);
  if (!opened) return { status: "error", message: DEAD_LINK_MESSAGE };

  const customer = await findCustomerById(opened.customerId);
  if (!customer) return { status: "error", message: DEAD_LINK_MESSAGE };

  // The binding check. A token minted against a stamp the row no longer carries
  // has been spent, or was superseded by a later request — see the note above.
  // `?? 0` mirrors the minting side's treatment of an account that has never
  // rotated a password.
  if ((customer.passwordChangedAt?.getTime() ?? 0) !== opened.passwordChangedAtMs) {
    return { status: "error", message: DEAD_LINK_MESSAGE };
  }

  const passwordHash = await hash(parsed.data.password, 12);
  await setCustomerPassword(customer.id, passwordHash);

  /**
   * "Your password was changed" — registered here, before the sign-in below,
   * because that call ends in a thrown redirect and nothing after it runs.
   * `after()` is documented to fire even when the response ends in a redirect
   * or an error, which is exactly the property this needs: the mail must go
   * whether or not the convenience sign-in works.
   *
   * Deferred rather than awaited for the same reason as the request side — a
   * Resend outage must not turn a completed password change into an error on
   * screen, and the shopper is mid-redirect either way.
   *
   * This is the notification that matters. The reset link says a reset was
   * *asked for*, which its owner can ignore if it wasn't them; this says one
   * *happened*, which they cannot.
   */
  after(async () => {
    await notifyPasswordChanged({ email: customer.email, name: customer.name });
  });

  // Not the email address, which is the customer's; `hadPassword` distinguishes
  // a genuine reset from a Google-only account being given its first password,
  // which is the one thing worth being able to tell apart afterwards.
  logInfo("account.password_reset_completed", {
    customerId: customer.id,
    hadPassword: Boolean(customer.passwordHash),
  });

  try {
    // Signing them in is the point of ending here rather than on the login
    // form: they have just proved control of the address and chosen the
    // password, and a shopper who resets a password and is then asked to type
    // it again reasonably wonders whether it took. This sign-in mints a token
    // stamped *after* the rotation, so it survives the revocation that has just
    // invalidated every other session on the account.
    await signIn("customer", {
      email: customer.email,
      password: parsed.data.password,
      redirectTo: "/account",
    });
    return { status: "idle" };
  } catch (error) {
    if (error instanceof AuthError) {
      // The password is changed either way — this is only about the convenience
      // sign-in, so it must not read as a failed reset.
      return { status: "error", message: "Your password was changed. Please sign in with it." };
    }
    // signIn() throws Next's internal redirect signal on success — rethrow
    // anything that isn't an auth failure so the navigation actually happens.
    throw error;
  }
}
