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
    // `data-surface` is what scopes the colorwork-chart palette. Every token in
    // that world is declared on this attribute rather than on :root, because
    // /admin shares this stylesheet and keeps the cream palette it was
    // deliberately designed around. This component was already the place that
    // knows which of the two surfaces is rendering, so it is the place that
    // says so.
    // `data-world` is stamped alongside `data-surface` and is what selects the
    // cut-out sheet's token block over the Akari one it is replacing. Both
    // blocks are complete, so removing this one attribute is a working
    // rollback for the whole visual world — which is the only reason the old
    // block is still in the stylesheet while the overhaul is in flight.
    <div data-surface="storefront" data-world="cutout" className="flex min-h-dvh flex-col">
      <Nav session={session} />
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
    </div>
  );
}
