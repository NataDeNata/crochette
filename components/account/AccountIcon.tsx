import Link from "next/link";
import { cn } from "@/lib/utils";

export function AccountIcon({ href, className }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center justify-center w-11 h-11 rounded-[14px]", className)}
      aria-label="Account"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="8" r="4.5" />
      </svg>
    </Link>
  );
}
