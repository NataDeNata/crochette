import type { Metadata } from "next";
import Link from "next/link";
import { redeemVerificationToken } from "@/lib/account/verification";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
};

/**
 * The landing page for the link in the verification mail.
 *
 * It mutates on a GET, which is worth saying out loud rather than leaving to be
 * noticed. The usual objection to that — a prefetcher, a mail scanner or a
 * back-button firing the effect — does not bite here, because verification is
 * idempotent and carries no privilege: the worst a link-scanner can do is prove
 * an address that its owner was asked to prove anyway, and the token is the
 * only thing that says which address. The alternative, a page with a "confirm"
 * button, adds a click that protects nothing.
 *
 * Signed out is the normal case. The token names its own customer, so nothing
 * here reads a session — a shopper who clicks the link on their phone, where
 * they have never signed in, still gets verified. `proxy.ts` lists this path as
 * public for exactly that reason.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const outcome = await redeemVerificationToken(token);

  const verified = outcome === "verified";

  return (
    <section className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] p-10 rounded-[24px] bg-card border-[1.5px] border-keyline/15 text-center">
        <div className="font-serif font-medium text-[26px] mb-2.5">
          {verified ? "Your email is confirmed" : "This link didn't work"}
        </div>
        <p className="text-[13.5px] text-muted-foreground leading-[1.65] mb-7">
          {verified ? (
            <>
              Thank you — we know this address is yours. Any orders you placed as a guest with it are now attached to
              your account.
            </>
          ) : (
            <>
              Confirmation links last seven days and stop working if the address on your account changes. Sign in and
              we&apos;ll offer you a fresh one.
            </>
          )}
        </p>
        <Link href={verified ? "/account" : "/account/login"} className="text-sm">
          {verified ? "Go to your account" : "Go to sign in"}
        </Link>
      </div>
    </section>
  );
}
