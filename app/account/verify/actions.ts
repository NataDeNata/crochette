"use server";

import { auth } from "@/lib/auth";
import { findCustomerById } from "@/lib/db/accounts";
import { sendVerificationLink } from "@/lib/account/verification";
import { getClientIp, isAuthRateLimited } from "@/lib/security/rate-limit";
import { rateLimited, type FormActionState } from "@/lib/actions/types";

/**
 * The banner's "send it again" button.
 *
 * Authorized here rather than only by the banner's visibility. A Server Action
 * is dispatched by its id, not by the path it is posted to, so the banner not
 * being rendered stops nobody — and this one sends mail to an address chosen by
 * the session, which makes an unauthenticated caller an open relay pointed at
 * whichever customer id they name. It reads nothing at all from the
 * form for the same reason: the address comes from the session and the
 * database, and a form field naming a recipient would be that relay with a
 * sign-in in front of it.
 */
export async function resendVerificationEmail(_prevState: FormActionState): Promise<FormActionState> {
  const session = await auth();
  if (session?.user?.role !== "customer" || !session.user.id) {
    return { status: "error", message: "Please sign in first." };
  }

  const customer = await findCustomerById(session.user.id);
  if (!customer) {
    return { status: "error", message: "Something went wrong on our end. Please try again in a moment." };
  }

  // Already proven. Reported as success rather than as an error: the shopper
  // asked for their address to be confirmed and it is, and a second tab or a
  // stale banner is the ordinary way to arrive here.
  if (customer.emailVerifiedAt) {
    return { status: "success", message: "Your email address is already confirmed." };
  }

  if (await isAuthRateLimited("verify-email", await getClientIp(), customer.email)) {
    return rateLimited();
  }

  await sendVerificationLink(customer);

  return {
    status: "success",
    message: `We've sent a new confirmation link to ${customer.email}. It can take a minute to arrive.`,
  };
}

