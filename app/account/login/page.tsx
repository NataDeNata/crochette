import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/account/LoginForm";
import { GoogleSignInButton } from "@/components/account/GoogleSignInButton";
import { FieldError } from "@/components/forms/FieldError";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

/** Auth.js redirects here with `?error=` on a failed OAuth attempt (see
 * `pages.error` in lib/auth.ts). Its codes are internal names, not copy, so
 * they're mapped rather than shown — and anything unrecognised still gets a
 * message, since a silent query string reads as the button doing nothing. */
function oauthErrorMessage(error: string | undefined): string | undefined {
  if (!error) return undefined;
  if (error === "OAuthAccountNotLinked") {
    return "That email is already registered. Sign in with your password instead.";
  }
  if (error === "AccessDenied") {
    return "Google sign-in was cancelled, or that account's email address isn't verified.";
  }
  return "We couldn't sign you in with Google. Please try again, or use your password.";
}

export default async function AccountLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role === "customer") redirect("/account");

  const { error } = await searchParams;

  return (
    <section className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-[360px] p-10 rounded-[24px] bg-card border-[1.5px] border-[oklch(0.9_0.02_60)]">
        <div className="font-serif font-medium text-[26px] text-center mb-1.5">Welcome back</div>
        <p className="text-[13px] text-muted-foreground text-center mb-7">
          Sign in to your Crochette account
        </p>
        <div className="mb-3.5">
          <FieldError error={oauthErrorMessage(error)} />
        </div>
        <LoginForm />
        <div className="mt-3.5">
          <GoogleSignInButton />
        </div>
        <p className="text-[13px] text-muted-foreground text-center mt-5">
          New here? <Link href="/account/signup">Create an account</Link>
        </p>
      </div>
    </section>
  );
}
