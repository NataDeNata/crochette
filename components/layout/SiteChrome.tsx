"use client";

import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { usePathname } from "next/navigation";
import { Nav } from "@/components/sections/Nav";
import { Footer } from "@/components/sections/Footer";
import { PageTransition } from "@/components/motion/PageTransition";

/** /admin is an internal dashboard, not part of the storefront — it skips
 * the public nav/footer/page-transition chrome and renders its own layout. */
export function SiteChrome({ children, session }: { children: ReactNode; session: Session | null }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return <>{children}</>;

  return (
    <>
      <Nav session={session} />
      <PageTransition>{children}</PageTransition>
      <Footer />
    </>
  );
}
