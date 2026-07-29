"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Package,
  Scissors,
  ShoppingBag,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import { adminSignOut } from "@/app/admin/actions";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** When true, only an exact pathname match highlights this item. Needed for
   * /admin itself, which is a prefix of every other admin route. */
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/custom-orders", label: "Custom requests", icon: Scissors },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
  { href: "/admin/discounts", label: "Discounts", icon: Ticket },
];

/** Which nav item the current URL belongs to.
 *
 * Prefix matching, so a detail page (/admin/orders/<uuid>) keeps its section
 * lit — but guarded on a `/` boundary so a hypothetical /admin/orders-archive
 * could never light up Orders. /admin opts out of prefix matching entirely via
 * `exact`, since it prefixes everything.
 *
 * `usePathname()` is the only reason this component is client-side. The old
 * top-bar nav had no active state at all, which is what this fixes. */
function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function badgeFor(item: NavItem, newRequestCount: number) {
  return item.href === "/admin/custom-orders" && newRequestCount > 0 ? newRequestCount : null;
}

export function AdminSidebar({
  email,
  newRequestCount,
}: {
  email: string;
  newRequestCount: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[232px] flex-none flex-col gap-1 border-r border-sidebar-border bg-sidebar px-3.5 py-5 md:flex">
      <Link href="/admin" className="mb-5 flex items-center gap-2.5 px-2.5 text-inherit">
        <span className="flex size-9 flex-none items-center justify-center rounded-full bg-brand text-brand-foreground">
          <Scissors className="size-4" aria-hidden />
        </span>
        <span className="font-serif text-lg leading-tight font-medium">Crochette</span>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          const badge = badgeFor(item, newRequestCount);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <item.icon className="size-[18px] flex-none" aria-hidden />
              <span className="min-w-0 truncate">{item.label}</span>
              {badge !== null ? (
                <span
                  className={`ml-auto flex h-[18px] min-w-[18px] flex-none items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                    active ? "bg-sidebar-primary-foreground text-sidebar-primary" : "bg-brand text-brand-foreground"
                  }`}
                >
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2 rounded-xl bg-card p-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 flex-none items-center justify-center rounded-full bg-sage text-sage-foreground text-xs font-bold">
            {/* Initial from the sign-in address — the only identity the admins
                table actually carries beyond email (there is one studio-owner
                login, see Cro_Documentation.md 6.3). */}
            {email.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold" title={email}>
              {email}
            </div>
            <div className="text-[11px] text-muted-foreground">Shop owner</div>
          </div>
        </div>
        <form action={adminSignOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-3.5" aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

/** Below `md` the 232px rail would eat the content, so it is replaced by a
 * horizontally scrolling icon strip rendered at the top of AdminPageHeader.
 * Same route table, same active logic — deliberately imported from here rather
 * than duplicated, so adding a nav item can't update one and miss the other. */
export function AdminMobileNav({ newRequestCount }: { newRequestCount: number }) {
  const pathname = usePathname();

  return (
    <nav className="-mx-6 mb-3 flex gap-1 overflow-x-auto px-6 pb-1 md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item);
        const badge = badgeFor(item, newRequestCount);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={item.label}
            className={`relative flex flex-none items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
              active ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <item.icon className="size-4 flex-none" aria-hidden />
            {item.label}
            {badge !== null ? (
              <span
                className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  active ? "bg-brand-foreground text-brand" : "bg-brand text-brand-foreground"
                }`}
              >
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
