"use server";

import { after } from "next/server";
import { findCustomerByEmail } from "@/lib/db/accounts";
import { forgotPasswordSchema } from "@/lib/validation/account";
import { mintPasswordResetToken } from "@/lib/security/account-token";
import { notifyPasswordReset, notifyPasswordResetUnavailable } from "@/lib/email/notifications";
import { getClientIp, isAuthRateLimited } from "@/lib/security/rate-limit";
import { invalidFields, rateLimited, type FormActionState } from "@/lib/actions/types";
import { logInfo } from "@/lib/observability/log";

/** The one answer this action ever gives on a well-formed address, whatever it
 * finds. Held as a constant so the three paths through the function below
 * cannot drift into wording themselves slightly differently — which is the
 * usual way a form that was designed not to enumerate accounts ends up
 * enumerating them. */
const SENT_MESSAGE =
  "If that address has an account with us, we've sent it a link. It can take a minute to arrive — check your spam folder if it doesn't.";

/**
 * Request a password reset.
 *
 * **It answers identically whether or not the account exists**, which is the
 * whole shape of the thing. Signup already admits that an address is taken (a
 * signup form that silently accepts a duplicate has no honest way to explain
 * itself), so this is not the last door — but it is an unauthenticated form
 * that would otherwise confirm an address on demand, and it costs nothing to
 * shut.
 *
 * Saying the same words is not enough on its own: sending mail takes a few
 * hundred milliseconds and not sending it does not, so an awaited send would
 * answer "account exists" in the response *time* while the text stayed
 * identical. `after()` moves every send out of the response entirely, so all
 * three paths — no account, Google-only account, real reset — return at the
 * same point having done the same work. It also means a Resend outage cannot
 * make this form hang or fail.
 *
 * A Google-only account gets mail too, explaining how to sign in rather than
 * offering a reset for a password it has never had. That mail is itself a
 * disclosure to whoever owns the inbox, which is exactly who should get it.
 */
export async function requestPasswordReset(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const email = formData.get("email");
  const values = { email: typeof email === "string" ? email : "" };

  const parsed = forgotPasswordSchema.safeParse({ email });
  if (!parsed.success) return invalidFields(parsed.error, { values });

  if (await isAuthRateLimited("password-reset", await getClientIp(), parsed.data.email.toLowerCase())) {
    return rateLimited({ values });
  }

  const customer = await findCustomerByEmail(parsed.data.email);

  if (customer) {
    // Minted here rather than inside the callback so the token's expiry is
    // measured from the request the shopper actually made, not from whenever
    // the platform gets around to running the callback.
    const token = customer.passwordHash
      ? mintPasswordResetToken(customer.id, customer.passwordChangedAt)
      : null;

    after(async () => {
      if (token) {
        await notifyPasswordReset({ email: customer.email, name: customer.name, token });
      } else {
        await notifyPasswordResetUnavailable({ email: customer.email, name: customer.name });
      }
    });

    // The address is deliberately absent — it is the customer's, and
    // lib/observability/log.ts scrubs PII from these anyway. `hasPassword` is
    // what makes the log readable when someone reports that no mail arrived.
    logInfo("account.password_reset_requested", { customerId: customer.id, hasPassword: Boolean(token) });
  }

  return { status: "success", message: SENT_MESSAGE };
}
