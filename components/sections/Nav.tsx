"use client";

import { useState } from "react";
import Link from "next/link";
import type { Session } from "next-auth";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CartIcon } from "@/components/cart/CartIcon";
import { AccountIcon } from "@/components/account/AccountIcon";

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
  "nav-drawer absolute top-full left-0 right-0 bg-sheet border-b-2 border-keyline flex flex-col px-5 py-2";

/* The studio's mark, in this world's own grammar: a press-out. A solid keyline
 * square with a dashed die line inside it and a fold tab on top — the same
 * three-part construction every figure on the sheet is built from, reduced to
 * 26px. Authored SVG rather than a glyph, because a font character here would
 * be the one mark on the page that did not come off the sheet. */
function PressOutMark() {
  return (
    <svg
      aria-hidden
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
      className="shrink-0 text-keyline"
    >
      <path d="M9.5 5.5V3.2h7v2.3" stroke="currentColor" strokeWidth="1.8" />
      <rect
        x="1.4"
        y="5.5"
        width="23.2"
        height="19.1"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="5.4"
        y="9.2"
        width="15.2"
        height="11.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="2.6 2.4"
      />
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
    /* The nav is the sheet's masthead. It still sits on the ground rather than
       on the sheet, but with both of them cream that is now a difference of
       about one percent of luminance rather than of viridian against white — so
       the 2px key rule that used to be the trimmed edge between them has come
       down to a hairline in --nav-border. It exists to keep the bar legible once
       content scrolls underneath it, which is the only job left for it.

       The bar stays opaque rather than translucent: the figures that scroll
       under it carry dashed cut lines and 2px keylines, and a blurred bar over
       printed rules reads as a smudge on the press. */
    <nav className="sticky top-0 z-50 flex items-center justify-between gap-4 py-4 page-gutter bg-ground border-b border-nav-border">
      {/* The wordmark, with the press-out mark beside it, both printed on a
          sand plate so the masthead reads as a printed label lying on the
          ground rather than as text floating on a colour. */}
      <Link
        href="/"
        className="group flex items-center gap-2.5 bg-butter border-2 border-keyline px-3 py-1.5 text-inherit"
      >
        <PressOutMark />
        <span className="type-sheet-display text-[17px] uppercase text-keyline">
          Crochette
        </span>
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
                // The die line under the page you are on: a press-red rule at
                // the same 2px weight every keyline on the sheet is printed at,
                // so "you are here" is drawn in the world's own stroke rather
                // than in a hairline borrowed from somewhere else. It was butter
                // when the bar was viridian; on cream, butter *is* the bar.
                <motion.div
                  layoutId="nav-active-underline"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  className="absolute left-0 right-0 -bottom-1.5 h-0.5 bg-press-red"
                />
              )}
            </Link>
          );
        })}
      </div>

      {!isShopPage && (
        // A tab, not the stock pill. Every actionable thing in this world is
        // taken by its tab, and the one control in the masthead is where that
        // would be most conspicuous to get wrong.
        <Link
          href="/shop"
          data-slot="button"
          // The focus outline is press red, not butter. Butter measures 1.2:1
          // against the cream ground it would be drawn on — a focus indicator
          // owes 3:1, and this one is the control a keyboard user reaches first.
          className="nav-cta inline-flex items-center border-2 border-keyline bg-sheet px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-keyline transition-colors duration-200 hover:bg-butter focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red"
        >
          Shop now
        </Link>
      )}

      <div className="flex items-center gap-1">
        <AccountIcon href={accountHref} className="nav-account-icon account-icon-link" />
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
            className="block w-[22px] h-0.5 bg-keyline"
          />
          <motion.span
            animate={reduceMotion ? undefined : { opacity: open ? 0 : 1 }}
            className="block w-[22px] h-0.5 bg-keyline"
          />
          <motion.span
            animate={reduceMotion ? undefined : { rotate: open ? -45 : 0, y: open ? -6 : 0 }}
            className="block w-[22px] h-0.5 bg-keyline"
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

    </nav>
  );
}
