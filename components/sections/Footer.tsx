import Link from "next/link";

export function Footer() {
  return (
    <footer className="pt-12 page-gutter pb-10 bg-footer text-footer-foreground">
      <div className="max-w-[1344px] mx-auto">
        <div className="footer-grid grid gap-12 mb-12">
          <div>
            {/* The footer is the underside of the sheet: back onto the ground,
                with the wordmark on its butter plate exactly as the masthead
                carries it, so the page opens and closes on the same mark. */}
            <div className="mb-5 inline-flex items-center gap-2.5 border-2 border-keyline bg-butter px-3 py-1.5">
              <svg
                aria-hidden
                width="22"
                height="22"
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
              <span className="type-sheet-display text-[16px] uppercase text-keyline">
                Crochette
              </span>
            </div>
            <p className="text-sm leading-[1.7] text-footer-muted max-w-[280px]">
              Handmade crochet decor and companions, stitched with quiet care.
            </p>
          </div>

          <div>
            <div className="type-sheet-spec mb-4 text-footer-heading">
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
            <div className="type-sheet-spec mb-4 text-footer-heading">
              Get in touch
            </div>
            <div className="flex flex-col gap-2.5 text-sm text-footer-muted">
              <span>hello@crochette.shop</span>
              <span>@crochette.studio</span>
            </div>
          </div>
        </div>

        {/* The Admin link is pinned to the right only once the row is wide
            enough to hold it beside the centered copyright. Below `sm` it was
            `absolute right-0` over a centered full-width string, so the two
            overlapped; there it becomes an ordinary stacked row instead. */}
        {/* --footer-subtle was lightened during the WCAG pass: at 13px on the
            footer's ink it measured 3.69:1, under the 4.5:1 body minimum.
            --footer-border stays where it is -- a decorative rule, not a
            control boundary, so 1.4.11's 3:1 does not apply to it. */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 text-[13px] text-footer-subtle border-t border-footer-border pt-6 sm:relative text-center">
          <span>© 2026 Crochette. Made by hand, in small batches.</span>
          <Link href="/admin" className="footer-admin-link sm:absolute sm:right-0 text-xs">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
