import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignupForm } from "@/components/account/SignupForm";

export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false, follow: false },
};

export default async function AccountSignupPage() {
  const session = await auth();
  if (session?.user?.role === "customer") redirect("/account");

  return (
    <section style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          padding: 40,
          borderRadius: 24,
          background: "oklch(0.98 0.01 85)",
          border: "1.5px solid oklch(0.9 0.02 60)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-cormorant), serif",
            fontWeight: 500,
            fontSize: 26,
            textAlign: "center",
            margin: "0 0 6px",
          }}
        >
          Create your account
        </div>
        <p style={{ fontSize: 13, color: "oklch(0.5 0.02 60)", textAlign: "center", margin: "0 0 28px" }}>
          Save addresses and track your orders
        </p>
        <SignupForm />
        <p style={{ fontSize: 13, color: "oklch(0.5 0.02 60)", textAlign: "center", marginTop: 20 }}>
          Already have an account? <Link href="/account/login">Sign in</Link>
        </p>
      </div>
    </section>
  );
}
