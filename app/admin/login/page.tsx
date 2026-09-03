import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin sign in",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ changed?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role === "admin") redirect("/admin");

  // Set by the change-password action, which has to end the session it was
  // called from — stamping `passwordChangedAt` revokes every admin token
  // issued before it, this browser's included. Without this note the redirect
  // to a login screen reads like the change failed.
  const { changed } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-[360px] rounded-3xl border border-border bg-card p-10 shadow-sm">
        <div className="mb-1.5 text-center font-serif text-2xl font-medium">Yarns and Buttons</div>
        <p className="mb-7 text-center text-[13px] text-muted-foreground">Studio admin sign in</p>
        {changed ? (
          <p className="mb-4 rounded-lg bg-muted px-3 py-2 text-center text-[13px]">
            Password changed. Sign in with the new one. Every other device has been signed out too.
          </p>
        ) : null}
        <AdminLoginForm />
      </div>
    </div>
  );
}
