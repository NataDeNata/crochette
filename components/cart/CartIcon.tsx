"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/CartContext";
import { cn } from "@/lib/utils";

export function CartIcon({ className }: { className?: string }) {
  const { count } = useCart();

  return (
    <Link
      href="/cart"
      className={cn("relative inline-flex items-center justify-center w-11 h-11 rounded-[14px]", className)}
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-0.75 rounded-[9px] bg-[oklch(0.55_0.09_20)] text-[oklch(0.98_0.01_85)] text-[10px] font-semibold flex items-center justify-center leading-none">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
