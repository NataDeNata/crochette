import Link from "next/link";

export function Footer() {
  return (
    <footer className="pt-12 page-gutter pb-10 bg-[oklch(0.28_0.02_60)] text-[oklch(0.97_0.01_85)]">
      <div className="max-w-[1344px] mx-auto">
        <div className="footer-grid grid gap-12 mb-12">
          <div>
            <div className="font-serif text-[26px] italic font-semibold mb-3.5">
              Crochette
            </div>
            <p className="text-sm leading-[1.7] text-[oklch(0.72_0.03_60)] max-w-[280px]">
              Handmade crochet decor and companions, stitched with quiet care.
            </p>
          </div>

          <div>
            <div className="text-[13px] font-semibold tracking-[1px] uppercase mb-4 text-[oklch(0.85_0.03_60)]">
              Explore
            </div>
            <div className="flex flex-col gap-2.5 text-sm">
              <Link href="/shop" className="footer-link">Shop</Link>
              <Link href="/gallery" className="footer-link">Gallery</Link>
              <Link href="/about" className="footer-link">About</Link>
              <Link href="/custom" className="footer-link">Custom orders</Link>
            </div>
          </div>

          <div>
            <div className="text-[13px] font-semibold tracking-[1px] uppercase mb-4 text-[oklch(0.85_0.03_60)]">
              Get in touch
            </div>
            <div className="flex flex-col gap-2.5 text-sm text-[oklch(0.72_0.03_60)]">
              <span>hello@crochette.shop</span>
              <span>@crochette.studio</span>
            </div>
          </div>
        </div>

        {/* The Admin link is pinned to the right only once the row is wide
            enough to hold it beside the centered copyright. Below `sm` it was
            `absolute right-0` over a centered full-width string, so the two
            overlapped; there it becomes an ordinary stacked row instead. */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 text-[13px] text-[oklch(0.6_0.025_60)] border-t border-[oklch(0.4_0.02_60)] pt-6 sm:relative text-center">
          <span>© 2026 Crochette. Made by hand, in small batches.</span>
          <Link href="/admin" className="footer-admin-link sm:absolute sm:right-0 text-xs">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
