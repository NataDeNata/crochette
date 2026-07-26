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
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 44,
        borderRadius: 14,
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      {count > 0 && (
        <span
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            minWidth: 17,
            height: 17,
            padding: "0 3px",
            borderRadius: 9,
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
