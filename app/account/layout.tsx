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
    <section className="pt-12 page-gutter pb-24 max-w-[900px] mx-auto">
      {/* `border-keyline/15`, not bare `border-keyline`. Every rule and card
          outline under /account was a hardcoded cream-palette oklch literal,
          which is why this whole area sat out the PR #11 repaint — a literal
          cannot follow a token change. --keyline itself is the near-black 2px
          printed rule of the cutout world; at full strength it would turn these
          soft hairlines into heavy black boxes, so they take the same /15 the
          storefront already uses for hairlines (see app/(home)/page.tsx). */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-9 pb-5 border-b-[1.5px] border-keyline/15">
        <nav className="flex gap-6">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="nav-link text-sm">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <span className="text-[13px] text-muted-foreground">{session.user.email}</span>
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
