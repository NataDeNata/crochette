"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/CartContext";

export function CartIcon({ className }: { className?: string }) {
  const { count } = useCart();

  return (
    <Link
      href="/cart"
      className={className}
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6 }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M6 8h12l-1 12H7L6 8Z" strokeLinejoin="round" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
      </svg>
      {count > 0 && (
        <span
          style={{
            position: "absolute",
            top: -2,
            right: -4,
            minWidth: 16,
            height: 16,
            padding: "0 3px",
            borderRadius: 8,
            background: "oklch(0.55 0.09 20)",
            color: "oklch(0.98 0.01 85)",
            fontSize: 10,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
