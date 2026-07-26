import Link from "next/link";

export function AccountIcon({ href, className }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      className={className}
      aria-label="Account"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 44,
        borderRadius: 14,
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="8" r="4.5" />
      </svg>
    </Link>
  );
}
