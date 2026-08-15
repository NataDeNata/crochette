"use client";

import { useState } from "react";
import Link from "next/link";
import type { Session } from "next-auth";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CartIcon } from "@/components/cart/CartIcon";
import { AccountIcon } from "@/components/account/AccountIcon";
import { accountDisplayName } from "@/lib/account/display-name";

/* /gallery is conditional. It is a real route with a designed empty state, but
 * an empty one is a top-level nav item that leads nowhere on a site whose
 * subject is how the pieces look — and a dead end in the nav costs more than a
 * missing entry. Curating the first photo in /admin/gallery publishes the
 * link; see `hasFeaturedGallery`. */
function links(hasGallery: boolean) {
  return [
    { href: "/shop", label: "Shop" },
    ...(hasGallery ? [{ href: "/gallery", label: "Gallery" }] : []),
    { href: "/about", label: "About" },
    { href: "/custom", label: "Custom Orders" },
    { href: "/contact", label: "Contact" },
  ];
}

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

export function Nav({
  session,
  hasGallery = false,
}: {
  session: Session | null;
  hasGallery?: boolean;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const LINKS = links(hasGallery);
  const isShopPage = pathname === "/shop";
  const isCustomer = session?.user?.role === "customer";
  const accountHref = isCustomer ? "/account" : "/account/login";
  // Only customers get greeted in the storefront masthead. An admin signed in
  // at /admin is a different surface with its own chrome, and the storefront
  // has no reason to announce that session here.
  const displayName = isCustomer ? accountDisplayName(session?.user) : null;

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
      {/* The masthead label hides below 1100px, so this is where a phone gets
          the same fact — at full width, where the name needs no truncation.
          Above the links rather than beside the account row: it is a statement
          about the session, not another place to tap. */}
      {displayName && (
        <span className="type-sheet-spec border-b border-keyline/15 py-3 text-keyline/70">
          Signed in as <span className="text-keyline">{displayName}</span>
        </span>
      )}
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
    /* A three-track grid rather than `flex justify-between`, so the links are
       centred on the *page* instead of on whatever space the wordmark and the
       icon cluster happened to leave over. `justify-between` centres nothing:
       it distributes free space, so the link group drifted left or right by
       half the difference between the two side clusters — and that difference
       moved on its own, because the cluster gains a "Shop now" tab everywhere
       except /shop and the account icon disappears at 860px. The links sat in
       a different place on the shop page than on every other page.

       `1fr auto 1fr` makes the side tracks equal by construction, so the centre
       track is page-centre at every width and stays there when a side control
       comes or goes. Both `1fr` tracks still floor at min-content, so a narrow
       window pushes the links off-centre rather than overlapping the wordmark —
       the failure mode is a nav that looks slightly wrong, not one that prints
       two controls on top of each other. */
    <nav className="sticky top-0 z-50 grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-4 page-gutter bg-ground border-b border-nav-border">
      {/* The wordmark, with the press-out mark beside it, both printed on a
          sand plate so the masthead reads as a printed label lying on the
          ground rather than as text floating on a colour. */}
      <Link
        href="/"
        // `justify-self-start` because a grid item stretches to fill its track
        // by default, and this one is a bordered plate — left to stretch, the
        // butter rectangle would run the full width of the left `1fr`.
        className="group flex items-center gap-2.5 justify-self-start bg-butter border-2 border-keyline px-3 py-1.5 text-inherit"
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

      {/* The "Shop now" tab now sits inside this cluster rather than as a track
          of its own between the links and the icons. It is an account-level
          control, not a nav destination — the links already carry /shop — and
          grouping it with the account and cart icons puts every control the
          masthead offers in one place at the right edge, leaving the centre
          track holding nothing but navigation.

          `gap-3` between the tab and the icons, `gap-1` inside the icon group:
          the icons are adjacent 44px targets that read as one unit, and giving
          the bordered tab that same 1-unit gap would fold it into them. The
          hamburger stays inside the gap-1 group deliberately — it is the only
          member of this cluster still visible at 320px, and hanging it off the
          outer gap-3 would have added 8px to the one width the masthead has
          already overflowed once. */}
      {/* `min-w-0` is what keeps the links centred once a name of unknown
          length joins this cluster.

          A `1fr auto 1fr` grid only centres the middle track while both side
          tracks actually resolve to `1fr`. A grid item's default `min-width` is
          `auto`, i.e. min-content — so a long enough label would force this
          track wider than its share, the two sides would stop being equal, and
          the links would slide left by half the excess. `min-w-0` lets the
          track hold its `1fr` and pushes the pressure onto the label, which
          truncates. The result is that the name gets shorter and the nav stays
          centred, rather than the name staying whole and the nav drifting. */}
      <div className="flex items-center gap-3 justify-self-end min-w-0">
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
            className="nav-cta inline-flex shrink-0 items-center border-2 border-keyline bg-sheet px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-keyline transition-colors duration-200 hover:bg-butter focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red"
          >
            Shop now
          </Link>
        )}

        {/* Sits immediately before the account icon it describes, and is the
            only shrinkable thing in this cluster — see the `min-w-0` note
            above. `truncate` needs the `min-w-0` on this element too, since it
            is itself a flex child and would otherwise refuse to go below its
            content width.

            Not a link: the account icon beside it already goes to /account, and
            a second control to the same place is the duplication that cost the
            masthead 48px at 320px once already. It carries no `aria-hidden`
            though — "signed in as x" is genuinely useful to a screen reader,
            and it is the only place the storefront says whose session this is. */}
        {displayName && (
          <span className="nav-user-label min-w-0 max-w-[16ch] truncate text-[13px] text-muted-foreground">
            Signed in as <span className="text-keyline font-medium">{displayName}</span>
          </span>
        )}

        <div className="flex shrink-0 items-center gap-1">
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
