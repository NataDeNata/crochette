"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
  { href: "/custom", label: "Custom Orders" },
  { href: "/contact", label: "Contact" },
];

const ACTIVE_COLOR = "oklch(0.55 0.09 20)";

export function Nav() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "22px 48px",
        background: "oklch(0.975 0.012 85 / 0.85)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid oklch(0.9 0.015 60)",
      }}
    >
      <Link
        href="/"
        style={{
          fontFamily: "var(--font-cormorant), serif",
          fontSize: 26,
          fontStyle: "italic",
          fontWeight: 600,
          letterSpacing: 0.5,
          color: "inherit",
        }}
      >
        Crochette
      </Link>

      <div className="nav-desktop-links" style={{ gap: 36, fontSize: 14, fontWeight: 500, letterSpacing: 0.3 }}>
        {LINKS.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{ position: "relative", color: isActive ? ACTIVE_COLOR : "inherit", paddingBottom: 6 }}
            >
              {link.label}
              {isActive && !reduceMotion && (
                <motion.div
                  layoutId="nav-active-underline"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: -6,
                    height: 2,
                    borderRadius: 2,
                    background: ACTIVE_COLOR,
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>

      <Link
        href="/shop"
        className="nav-cta"
        style={{
          border: "1.5px solid oklch(0.28 0.02 60)",
          borderRadius: 24,
          padding: "8px 20px",
          fontSize: 13,
          fontWeight: 500,
          color: "oklch(0.28 0.02 60)",
        }}
      >
        Shop now
      </Link>

      <button
        type="button"
        className="nav-hamburger-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle menu"
        aria-expanded={open}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 6,
          flexDirection: "column",
          gap: 5,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <motion.span
          animate={reduceMotion ? undefined : { rotate: open ? 45 : 0, y: open ? 6 : 0 }}
          style={{ display: "block", width: 22, height: 2, borderRadius: 2, background: "oklch(0.28 0.02 60)" }}
        />
        <motion.span
          animate={reduceMotion ? undefined : { opacity: open ? 0 : 1 }}
          style={{ display: "block", width: 22, height: 2, borderRadius: 2, background: "oklch(0.28 0.02 60)" }}
        />
        <motion.span
          animate={reduceMotion ? undefined : { rotate: open ? -45 : 0, y: open ? -6 : 0 }}
          style={{ display: "block", width: 22, height: 2, borderRadius: 2, background: "oklch(0.28 0.02 60)" }}
        />
      </button>

      {reduceMotion ? (
        open && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "oklch(0.975 0.012 85 / 0.98)",
              backdropFilter: "blur(8px)",
              borderBottom: "1px solid oklch(0.9 0.015 60)",
              display: "flex",
              flexDirection: "column",
              padding: 24,
              gap: 18,
            }}
          >
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} style={{ color: pathname === link.href ? ACTIVE_COLOR : "inherit" }}>
                {link.label}
              </Link>
            ))}
            <Link href="/shop" style={{ color: "oklch(0.28 0.02 60)", fontWeight: 500 }}>
              Shop now
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
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "oklch(0.975 0.012 85 / 0.98)",
                backdropFilter: "blur(8px)",
                borderBottom: "1px solid oklch(0.9 0.015 60)",
                display: "flex",
                flexDirection: "column",
                padding: 24,
                gap: 18,
              }}
            >
              {LINKS.map((link) => (
                <Link key={link.href} href={link.href} style={{ color: pathname === link.href ? ACTIVE_COLOR : "inherit" }}>
                  {link.label}
                </Link>
              ))}
              <Link href="/shop" style={{ color: "oklch(0.28 0.02 60)", fontWeight: 500 }}>
                Shop now
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </nav>
  );
}
