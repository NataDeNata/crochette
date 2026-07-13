"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

      <div style={{ display: "flex", gap: 36, fontSize: 14, fontWeight: 500, letterSpacing: 0.3 }}>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{ color: pathname === link.href ? ACTIVE_COLOR : "inherit" }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <Link
        href="/shop"
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
    </nav>
  );
}
