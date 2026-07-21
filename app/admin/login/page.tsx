import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin sign in",
};

export default async function AdminLoginPage() {
  const session = await auth();
  if (session?.user) redirect("/admin");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
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
          Crochette
        </div>
        <p style={{ fontSize: 13, color: "oklch(0.5 0.02 60)", textAlign: "center", margin: "0 0 28px" }}>
          Studio admin sign in
        </p>
        <AdminLoginForm />
      </div>
    </div>
  );
}
