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

  // Sticky-footer shell. Nav/content/Footer used to be three siblings in normal
  // flow with nothing claiming the leftover height, so on any page shorter than
  // the viewport the footer sat directly under the content with cream below it
  // — most visible on /account, which is a heading and two cards.
  //
  // `dvh` rather than the `svh` the landing-page heroes use: those want "fits on
  // screen with the browser toolbars showing", this wants "never shorter than
  // the viewport as it actually is right now". `svh` here would reintroduce the
  // same gap the moment a mobile toolbar retracted.
  //
  // The `flex-1` lives on a real <main> rather than on PageTransition's element
  // because PageTransition has two branches and only one of them renders a DOM
  // node — under `prefers-reduced-motion` it returns a bare fragment, so a
  // growable wrapper there would fix this for some visitors and not others.
  // <main> also gives the storefront the landmark it never had; /admin has had
  // one since its redesign.
  return (
    <div className="flex min-h-dvh flex-col">
      <Nav session={session} />
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
    </div>
  );
}
