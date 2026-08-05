"use client";

import { useState } from "react";
import Link from "next/link";
import type { Session } from "next-auth";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CartIcon } from "@/components/cart/CartIcon";
import { AccountIcon } from "@/components/account/AccountIcon";
import { Button } from "@/components/ui/button";
import { PaperBand } from "@/components/sections/PaperBand";

const LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
  { href: "/custom", label: "Custom Orders" },
  { href: "/contact", label: "Contact" },
];

/** Shared by the animated and reduced-motion drawer shells — see the note at
 * the render site. `py-3` on the rows rather than pure `gap`, so each tap
 * target clears 44px on a phone. */
const DRAWER_CLASS =
  "absolute top-full left-0 right-0 bg-background/98 backdrop-blur border-b border-nav-border flex flex-col px-5 py-2";

/* The studio's seal: a hand-cut square stamp, drawn rather than typeset. Four
 * uneven strokes inside a rough border, which is what a carved seal actually
 * looks like — a perfectly even one would read as an icon-library glyph and
 * this world does not use those. */
function StudioStamp() {
  return (
    <svg
      aria-hidden
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
      className="shrink-0 text-vermilion"
    >
      <rect
        x="1.2"
        y="1.2"
        width="23.6"
        height="23.6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M6.5 7.2v11.6M11 6.6v12.8M15.6 8v10.4M20 7v11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M6 12.6h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Nav({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const isShopPage = pathname === "/shop";
  const accountHref = session?.user?.role === "customer" ? "/account" : "/account/login";

  // Close the mobile drawer on route change — derived during render (React's
  // recommended pattern for resetting state on a prop change) rather than in
  // a useEffect, which would cause an extra render pass.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  const drawerBody = (
    <>
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="nav-link py-3"
          data-active={pathname === link.href}
        >
          {link.label}
        </Link>
      ))}
      {!isShopPage && (
        <Link href="/shop" className="nav-link py-3 font-medium">
          Shop now
        </Link>
      )}
      <Link href={accountHref} className="nav-link py-3 font-medium">
        {session?.user?.role === "customer" ? "My account" : "Sign in"}
      </Link>
    </>
  );

  return (
    /* The nav rides its own sheet of paper, and the sheet bows into whatever is
       below it — which on the landing page is the photograph.
       The band hangs off the bottom with `absolute top-full`, so it costs no
       layout height and `--nav-h` stays the 89px every full-bleed hero measures
       itself against. It also means the curve overlaps the content rather than
       pushing it down, which is what makes it read as one sheet lying over
       another instead of a divider between two blocks.
       `border-b` is gone: the sheet's own drawn edge is the boundary now, and a
       straight rule under a curved one was the thing that made the header look
       bolted on. */
    <nav className="sticky top-0 z-50 flex items-center justify-between py-[22px] page-gutter bg-background/85 backdrop-blur">
      {/* The wordmark, with the studio's stamp beside it. The stamp is authored
          SVG in the world's own grammar — a hand-cut seal, not a glyph pulled
          from a font — and it is the single place vermilion appears in the
          chrome. */}
      <Link href="/" className="group flex items-center gap-3 text-inherit">
        <StudioStamp />
        <span className="type-akari-label text-[13px] tracking-[0.22em] text-ink">Crochette</span>
      </Link>

      <div className="nav-desktop-links gap-9 text-sm font-medium tracking-[0.3px]">
        {LINKS.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="nav-link relative pb-1.5"
              data-active={isActive}
            >
              {link.label}
              {isActive && !reduceMotion && (
                // A single vermilion hairline. This world spends its one colour
                // on marks, never on fills, so "you are here" is a stroke of
                // ink rather than a filled shape.
                <motion.div
                  layoutId="nav-active-underline"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  className="absolute left-0 right-0 -bottom-1.5 h-px bg-vermilion"
                />
              )}
            </Link>
          );
        })}
      </div>

      {!isShopPage && (
        <Button href="/shop" size="sm" className="nav-cta">
          Shop now
        </Button>
      )}

      <div className="flex items-center gap-1">
        <AccountIcon href={accountHref} className="account-icon-link" />
        <CartIcon className="cart-icon-link" />

        <button
          type="button"
          className="nav-hamburger-btn bg-transparent border-0 cursor-pointer p-1.5 flex-col gap-1.25 items-center justify-center"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <motion.span
            animate={reduceMotion ? undefined : { rotate: open ? 45 : 0, y: open ? 6 : 0 }}
            className="block w-[22px] h-px bg-ink"
          />
          <motion.span
            animate={reduceMotion ? undefined : { opacity: open ? 0 : 1 }}
            className="block w-[22px] h-px bg-ink"
          />
          <motion.span
            animate={reduceMotion ? undefined : { rotate: open ? -45 : 0, y: open ? -6 : 0 }}
            className="block w-[22px] h-px bg-ink"
          />
        </button>
      </div>

      {/* One drawer body, shared by both branches below. These used to be two
          hand-maintained copies and had already drifted: the reduced-motion
          copy offered a "My account" / "Sign in" link and the animated one —
          what almost everyone actually sees — did not. Rendering the same
          nodes into either shell makes that class of divergence impossible. */}
      {reduceMotion ? (
        open && <div className={DRAWER_CLASS}>{drawerBody}</div>
      ) : (
        <AnimatePresence>
          {open && (
            <motion.div
              key="drawer"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={DRAWER_CLASS}
            >
              {drawerBody}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* The sheet the header sits on, bowing into the page below. Sits under
          the drawer in source order so an open mobile drawer covers it. */}
      <PaperBand edge="top" className="absolute top-full left-0 right-0 -z-10" />
    </nav>
  );
}
