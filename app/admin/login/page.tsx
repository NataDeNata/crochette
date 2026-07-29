import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin sign in",
};

export default async function AdminLoginPage() {
  const session = await auth();
  if (session?.user?.role === "admin") redirect("/admin");

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[360px] p-10 rounded-[24px] bg-card border-[1.5px] border-[oklch(0.9_0.02_60)]">
        <div className="font-serif font-medium text-[26px] text-center mb-1.5">Crochette</div>
        <p className="text-[13px] text-muted-foreground text-center mb-7">Studio admin sign in</p>
        <AdminLoginForm />
      </div>
    </div>
  );
}
