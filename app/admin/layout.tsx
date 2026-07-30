import type { Metadata } from "next";
import type { ReactNode } from "react";
import { count, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { customOrderRequests } from "@/lib/db/schema";
import { AdminMobileNav, AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  // Middleware already gates every /admin/* route except /admin/login by
  // role, but /admin/login itself is exempt from that check — so a
  // logged-in *customer* visiting it still has a truthy session. Check the
  // role explicitly, not just session presence, so the dashboard chrome
  // never renders around anything but a real admin session.
  if (session?.user?.role !== "admin") return <>{children}</>;

  // Drives the sidebar's "Custom requests" badge. One indexed count on an enum
  // column, and every /admin route is already fully dynamic (the root layout
  // awaits auth() and getCart() on each request), so this adds no new render
  // mode — just one more cheap query alongside the auth lookup above.
  const [{ newRequestCount }] = await db
    .select({ newRequestCount: count() })
    .from(customOrderRequests)
    .where(eq(customOrderRequests.status, "new"));

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar email={session.user.email ?? ""} newRequestCount={newRequestCount} />
      {/* min-w-0 so a wide table inside scrolls rather than forcing the flex
          row wider than the viewport. Each page still supplies its own
          `mx-auto max-w-*` — the deliberate 2026-07-28 choice, since the wide
          tables and the single-column forms genuinely want different widths. */}
      <main className="min-w-0 flex-1 px-6 pb-14 md:px-8">
        {/* Rendered here rather than inside AdminPageHeader so the badge count
            doesn't have to be threaded as a prop through all fifteen admin
            pages just to reach one strip. Not sticky — the page header below
            it is, which is the part worth keeping on screen while scrolling. */}
        <AdminMobileNav newRequestCount={newRequestCount} />
        {children}
      </main>
    </div>
  );
}
