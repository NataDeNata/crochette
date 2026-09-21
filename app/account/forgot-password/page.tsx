import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ForgotPasswordForm } from "@/components/account/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  // Someone already signed in has no use for this, and arriving here usually
  // means a stale tab or a bookmark rather than a real request.
  const session = await auth();
  if (session?.user?.role === "customer") redirect("/account");

  return (
    <section className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-[360px] p-10 rounded-[24px] bg-card border-[1.5px] border-keyline/15">
        <div className="font-serif font-medium text-[26px] text-center mb-1.5">Reset your password</div>
        <p className="text-[13px] text-muted-foreground text-center mb-7">
          Enter your email address and we&apos;ll send you a link to set a new one.
        </p>
        <ForgotPasswordForm />
        <p className="text-[13px] text-muted-foreground text-center mt-5">
          <Link href="/account/login">Back to sign in</Link>
        </p>
      </div>
    </section>
  );
}
