import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/account/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function AccountLoginPage() {
  const session = await auth();
  if (session?.user?.role === "customer") redirect("/account");

  return (
    <section className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-[360px] p-10 rounded-[24px] bg-card border-[1.5px] border-[oklch(0.9_0.02_60)]">
        <div className="font-serif font-medium text-[26px] text-center mb-1.5">Welcome back</div>
        <p className="text-[13px] text-muted-foreground text-center mb-7">
          Sign in to your Crochette account
        </p>
        <LoginForm />
        <p className="text-[13px] text-muted-foreground text-center mt-5">
          New here? <Link href="/account/signup">Create an account</Link>
        </p>
      </div>
    </section>
  );
}
