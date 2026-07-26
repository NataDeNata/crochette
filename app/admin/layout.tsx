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
    <div style={{ minHeight: "100vh", background: "oklch(0.98 0.01 85)" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 32px",
          borderBottom: "1.5px solid oklch(0.9 0.02 60)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <span style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 20 }}>
            Crochette admin
          </span>
          <nav style={{ display: "flex", gap: 20 }}>
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} style={{ fontSize: 13.5, color: "oklch(0.4 0.02 60)" }}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "oklch(0.5 0.02 60)" }}>{session.user.email}</span>
          <form action={adminSignOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main style={{ padding: "32px" }}>{children}</main>
    </div>
  );
}
