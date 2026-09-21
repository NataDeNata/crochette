"use client";

import { useActionState } from "react";
import { resendVerificationEmail } from "@/app/account/verify/actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";

/**
 * The standing offer to resend the confirmation link, shown across /account
 * while the address is unproven.
 *
 * Deliberately not a blocker and deliberately not dismissible. Not a blocker
 * because enforcement is soft — an unverified shopper signs in, browses and
 * checks out exactly as before, since pushing account holders onto the guest
 * path would make the store *less* able to say who placed an order, not more.
 * Not dismissible because the one thing it is actually buying — guest orders
 * attaching to the account — is invisible until it happens, so a banner that
 * can be closed is a feature that silently never runs.
 *
 * Once the address is confirmed the banner stops rendering entirely: the layout
 * decides, from the row rather than from the session, so a shopper who verifies
 * in another tab is not told to verify again by a stale JWT.
 */
export function VerifyEmailBanner({ email }: { email: string }) {
  const [state, formAction, isPending] = useActionState(resendVerificationEmail, IDLE_STATE);

  return (
    <div
      className="mb-7 p-5 rounded-[16px] border-[1.5px] border-keyline/15 bg-butter/60 flex items-center justify-between flex-wrap gap-4"
      /* Not role="alert": this is present on arrival rather than announced in
         response to something, and an alert that fires on every page load
         interrupts a screen reader reader for news they already have. The
         resend result below is the part that is genuinely new, and it carries
         its own live region. */
    >
      <div className="max-w-[46ch]">
        <p className="text-sm font-medium m-0 mb-1">Please confirm your email address</p>
        <p className="text-[13px] text-muted-foreground m-0 leading-[1.6]">
          We sent a link to {email}. Confirming it attaches any orders you placed as a guest to this account.
        </p>
      </div>
      <form action={formAction}>
        <Button type="submit" variant="outline" size="sm" disabled={isPending}>
          {isPending ? "Sending…" : "Send it again"}
        </Button>
      </form>
      {state.status !== "idle" && (
        <p
          role="status"
          className={`w-full m-0 text-[13px] ${state.status === "error" ? "text-destructive" : "text-muted-foreground"}`}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
