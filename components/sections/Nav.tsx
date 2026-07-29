"use client";

import { useState } from "react";
import Link from "next/link";
import type { Session } from "next-auth";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CartIcon } from "@/components/cart/CartIcon";
import { AccountIcon } from "@/components/account/AccountIcon";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
  { href: "/custom", label: "Custom Orders" },
  { href: "/contact", label: "Contact" },
];

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

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between py-[22px] px-12 bg-[oklch(0.975_0.012_85/0.85)] backdrop-blur border-b border-[oklch(0.9_0.015_60)]">
      <Link href="/" className="font-serif text-[26px] italic font-semibold tracking-[0.5px] text-inherit">
        Crochette
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
                <motion.div
                  layoutId="nav-active-underline"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  className="absolute left-0 right-0 -bottom-1.5 h-0.5 rounded-[2px] bg-[oklch(0.55_0.09_20)]"
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
            className="block w-[22px] h-0.5 rounded-[2px] bg-primary"
          />
          <motion.span
            animate={reduceMotion ? undefined : { opacity: open ? 0 : 1 }}
            className="block w-[22px] h-0.5 rounded-[2px] bg-primary"
          />
          <motion.span
            animate={reduceMotion ? undefined : { rotate: open ? -45 : 0, y: open ? -6 : 0 }}
            className="block w-[22px] h-0.5 rounded-[2px] bg-primary"
          />
        </button>
      </div>

      {reduceMotion ? (
        open && (
          <div className="absolute top-full left-0 right-0 bg-[oklch(0.975_0.012_85/0.98)] backdrop-blur border-b border-[oklch(0.9_0.015_60)] flex flex-col p-6 gap-4.5">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link" data-active={pathname === link.href}>
                {link.label}
              </Link>
            ))}
            {!isShopPage && (
              <Link href="/shop" className="nav-link font-medium">
                Shop now
              </Link>
            )}
            <Link href={accountHref} className="nav-link font-medium">
              {session?.user?.role === "customer" ? "My account" : "Sign in"}
            </Link>
          </div>
        )
      ) : (
        <AnimatePresence>
          {open && (
            <motion.div
              key="drawer"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-full left-0 right-0 bg-[oklch(0.975_0.012_85/0.98)] backdrop-blur border-b border-[oklch(0.9_0.015_60)] flex flex-col p-6 gap-4.5"
            >
              {LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="nav-link" data-active={pathname === link.href}>
                  {link.label}
                </Link>
              ))}
              {!isShopPage && (
                <Link href="/shop" className="nav-link font-medium">
                  Shop now
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </nav>
  );
}
