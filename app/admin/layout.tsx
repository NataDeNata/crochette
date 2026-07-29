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
  { href: "/admin/gallery", label: "Gallery" },
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
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-[18px] px-8 border-b-[1.5px] border-[oklch(0.9_0.02_60)]">
        <span className="font-serif font-medium text-xl">Crochette admin</span>
        <nav className="flex justify-self-center gap-6">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[14.5px] text-[oklch(0.4_0.02_60)] transition-colors hover:text-[oklch(0.2_0.02_60)] hover:underline underline-offset-4"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-self-end gap-4">
          <span className="text-[13.5px] text-muted-foreground">{session.user.email}</span>
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
