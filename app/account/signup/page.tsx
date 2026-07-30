import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignupForm } from "@/components/account/SignupForm";
import { GoogleSignInButton } from "@/components/account/GoogleSignInButton";

export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false, follow: false },
};

export default async function AccountSignupPage() {
  const session = await auth();
  if (session?.user?.role === "customer") redirect("/account");

  return (
    <section className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-[380px] p-10 rounded-[24px] bg-card border-[1.5px] border-[oklch(0.9_0.02_60)]">
        <div className="font-serif font-medium text-[26px] text-center mb-1.5">Create your account</div>
        <p className="text-[13px] text-muted-foreground text-center mb-7">
          Save addresses and track your orders
        </p>
        <SignupForm />
        <div className="mt-3.5">
          <GoogleSignInButton label="Sign up with Google" />
        </div>
        <p className="text-[13px] text-muted-foreground text-center mt-5">
          Already have an account? <Link href="/account/login">Sign in</Link>
        </p>
      </div>
    </section>
  );
}
