"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Nav } from "@/components/sections/Nav";
import { Footer } from "@/components/sections/Footer";
import { PageTransition } from "@/components/motion/PageTransition";

/** /admin is an internal dashboard, not part of the storefront — it skips
 * the public nav/footer/page-transition chrome and renders its own layout. */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return <>{children}</>;

  return (
    <>
      <Nav />
      <PageTransition>{children}</PageTransition>
      <Footer />
    </>
  );
}
