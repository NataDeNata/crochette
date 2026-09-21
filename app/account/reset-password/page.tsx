import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/account/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
};

/**
 * The landing page for the link in the reset mail.
 *
 * The token is **not** verified here, only carried into the form. Checking it
 * on render would mean checking it twice — once for the page and once for the
 * submit that actually matters — and the second check is the only one that can
 * be trusted anyway, since the link may be spent in the minutes between the two.
 * A single verification, at the moment of the write, is both simpler and the
 * one that cannot go stale.
 *
 * There is no session check, deliberately: a shopper resetting a password is
 * usually locked out, and a signed-in one may be resetting precisely because
 * someone else is in the account.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <section className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-[360px] p-10 rounded-[24px] bg-card border-[1.5px] border-keyline/15">
        <div className="font-serif font-medium text-[26px] text-center mb-1.5">Set a new password</div>
        {token ? (
          <>
            <p className="text-[13px] text-muted-foreground text-center mb-7">
              Choose something at least eight characters long. Setting it signs you in and ends every other session on
              your account.
            </p>
            <ResetPasswordForm token={token} />
          </>
        ) : (
          <p className="text-[13px] text-muted-foreground text-center mb-7">
            This page needs the link from your reset email. <Link href="/account/forgot-password">Request a new one</Link>
            .
          </p>
        )}
        <p className="text-[13px] text-muted-foreground text-center mt-5">
          <Link href="/account/login">Back to sign in</Link>
        </p>
      </div>
    </section>
  );
}
