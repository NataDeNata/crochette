import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { accountSignOut } from "@/app/account/actions";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/account", label: "Dashboard" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
];

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  // proxy.ts already gates every /account/* route except /account/login and
  // /account/signup, so a missing customer session here only happens on
  // those two pages — render them bare, without the account sub-nav, same
  // pattern as app/admin/layout.tsx.
  if (session?.user?.role !== "customer") return <>{children}</>;

  return (
    <section style={{ padding: "48px 48px 96px", maxWidth: 900, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 36,
          paddingBottom: 20,
          borderBottom: "1.5px solid oklch(0.9 0.02 60)",
        }}
      >
        <nav style={{ display: "flex", gap: 24 }}>
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="nav-link" style={{ fontSize: 14 }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "oklch(0.5 0.02 60)" }}>{session.user.email}</span>
          <form action={accountSignOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
      {children}
    </section>
  );
}
