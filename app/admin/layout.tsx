import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { adminSignOut } from "@/app/admin/actions";

const NAV_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/custom-orders", label: "Custom orders" },
  { href: "/admin/orders", label: "Orders" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  // Middleware already gates every /admin/* route except /admin/login, so
  // a missing session here only happens on the login page itself — render
  // it bare, without the dashboard nav.
  if (!session?.user) return <>{children}</>;

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
            <button
              type="submit"
              style={{
                border: "1.5px solid oklch(0.75 0.03 20)",
                background: "none",
                color: "oklch(0.28 0.02 60)",
                padding: "8px 16px",
                borderRadius: 20,
                fontSize: 13,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main style={{ padding: "32px" }}>{children}</main>
    </div>
  );
}
