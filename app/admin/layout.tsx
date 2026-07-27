import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { adminSignOut } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const NAV_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/discounts", label: "Discounts" },
  { href: "/admin/custom-orders", label: "Custom orders" },
  { href: "/admin/orders", label: "Orders" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  // Middleware already gates every /admin/* route except /admin/login by
  // role, but /admin/login itself is exempt from that check — so a
  // logged-in *customer* visiting it still has a truthy session. Check the
  // role explicitly, not just session presence, so the dashboard chrome
  // never renders around anything but a real admin session.
  if (session?.user?.role !== "admin") return <>{children}</>;

  return (
    <div className="min-h-screen bg-card">
      <header className="flex items-center justify-between py-[18px] px-8 border-b-[1.5px] border-[oklch(0.9_0.02_60)]">
        <div className="flex items-center gap-8">
          <span className="font-serif font-medium text-xl">Crochette admin</span>
          <nav className="flex gap-5">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-[13.5px] text-[oklch(0.4_0.02_60)]">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[13px] text-muted-foreground">{session.user.email}</span>
          <form action={adminSignOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="p-8">{children}</main>
    </div>
  );
}
