import { mintEmailVerificationToken, verifyEmailVerificationToken } from "@/lib/security/account-token";
import { notifyEmailVerification } from "@/lib/email/notifications";
import { claimGuestOrders, markEmailVerified } from "@/lib/db/accounts";
import { logError, logInfo } from "@/lib/observability/log";

/**
 * Mint a verification link for a customer and mail it.
 *
 * One function rather than the same four lines in signup and in the banner's
 * resend, because the two must agree about what a link contains: the token
 * binds the address it proves, and a resend that minted against a different
 * address than signup did would produce links that verify nothing.
 *
 * Never throws. `notifyEmailVerification` already routes through the shared
 * safe-send, so a Resend outage costs a log line rather than the signup that
 * triggered it — an account that exists but has not been mailed is recoverable
 * from the banner; a signup that throws after the row is written is not.
 */
export async function sendVerificationLink(customer: { id: string; email: string; name?: string | null }) {
  await notifyEmailVerification({
    email: customer.email,
    name: customer.name,
    token: mintEmailVerificationToken(customer.id, customer.email),
  });
}

/**
 * What happens when someone clicks the link. Idempotent by construction: the
 * token carries no nonce, nothing is spent, and a second click on the same link
 * reports the same success.
 *
 * "Already verified" is deliberately *not* a third outcome. It would only ever
 * change the wording on a page that is telling the shopper the same true thing
 * either way, and a separate state would invite a caller to treat one of them
 * as a failure — which is how a second click on a link that worked starts
 * reading as a link that did not.
 */
export type VerificationOutcome = "verified" | "invalid";

export async function redeemVerificationToken(token: string | undefined): Promise<VerificationOutcome> {
  if (!token) return "invalid";

  const opened = verifyEmailVerificationToken(token);
  if (!opened) return "invalid";

  // The address check lives in `markEmailVerified`, not here: it compares the
  // token's bound address against the row's *current* one, which is the
  // property the binding exists to give us.
  const verified = await markEmailVerified(opened.customerId, opened.email);
  if (!verified) return "invalid";

  /**
   * The claim, and the reason verification is worth anything beyond a tick.
   *
   * Until this moment a password account's guest orders stayed unattached,
   * because matching them on an unproven address would hand one person's name,
   * phone number and shipping address to whoever signed up with their email.
   * The address is now proven, so the same call `lib/auth.ts` makes for Google
   * is safe here — and running it here rather than waiting for the next sign-in
   * is what makes the orders appear on the page the shopper lands on.
   *
   * Non-fatal, like every other call site: a failure leaves the orders
   * unclaimed and recoverable at the next sign-in, whereas a throw would tell a
   * shopper their verification failed when it did not.
   */
  try {
    const claimed = await claimGuestOrders(opened.customerId, opened.email);
    if (claimed > 0) {
      logInfo("orders.guest_claimed", { customerId: opened.customerId, count: claimed, via: "email_verification" });
    }
  } catch (err) {
    logError("orders.guest_claim_failed", err, {
      detail:
        "past guest orders could not be attached after verification; the address is still verified and the next sign-in will retry",
    });
  }

  return "verified";
}
