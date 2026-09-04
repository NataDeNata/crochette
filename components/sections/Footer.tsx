import Link from "next/link";
import Image from "next/image";

export function Footer({ hasGallery = false }: { hasGallery?: boolean }) {
  return (
    <footer className="pt-12 page-gutter pb-10 bg-footer text-footer-foreground">
      <div className="max-w-[1344px] mx-auto">
        <div className="footer-grid grid gap-12 mb-12">
          <div>
            {/* The footer is the underside of the sheet: the wordmark keeps its
                butter plate exactly as the masthead carries it, so the page
                opens and closes on the same mark, and the badge sits beside
                the plate rather than inside it. */}
            <div className="mb-5 flex items-center gap-2.5">
              {/* Same badge as the masthead, two pixels smaller to match the
                  wordmark beside it. See `BrandMark` in Nav.tsx for why the
                  square crop is deliberate. Not `priority`: the footer is
                  below the fold on every route.

                  The round clip earns more here than it does up top. The
                  masthead stands this cream JPEG on cream; the footer stands it
                  on the dark ground, where four square cream corners would read
                  as a lit tile rather than as a badge. */}
              <Image
                src="/logo.jpg"
                alt=""
                aria-hidden
                width={624}
                height={930}
                className="h-[28px] w-[28px] shrink-0 rounded-full object-cover"
              />
              <span className="type-sheet-display border-2 border-keyline bg-butter px-3 py-1.5 text-[16px] uppercase text-keyline">
                Yarns and Buttons
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
              {hasGallery && (
                <Link href="/gallery" className="footer-link">Gallery</Link>
              )}
              <Link href="/about" className="footer-link">About</Link>
              <Link href="/custom" className="footer-link">Custom orders</Link>
              <Link href="/contact" className="footer-link">Contact</Link>
            </div>
          </div>

          <div>
            <div className="type-sheet-spec mb-4 text-footer-heading">
              The small print
            </div>
            <div className="flex flex-col gap-2.5 text-sm">
              <Link href="/shipping" className="footer-link">Shipping</Link>
              <Link href="/returns" className="footer-link">Returns</Link>
              <Link href="/privacy" className="footer-link">Privacy</Link>
              <Link href="/terms" className="footer-link">Terms</Link>
            </div>
          </div>

          {/* The "Get in touch" column is deliberately absent, not lost.
              It printed two links: a mailto to hello@crochette.shop, whose
              domain returns NXDOMAIN — mail to it bounces today — and the
              studio's Instagram handle. Publishing a dead address as a live
              `mailto:` is worse than publishing none: it reads as a working
              route and silently swallows whatever a shopper sends. The handle
              came out with it rather than being left as a lone orphan under a
              heading that no longer describes a column.

              /contact is still linked from Explore above, and it is a real
              page backed by the database rather than by mail, so the footer
              has not stopped offering a way through.

              This comes back when issue #17 lands a verified domain and a
              contact address held in one place. The same dead address is still
              printed on /contact, in the JSON-LD Organization schema, and as
              the data-controller contact in /privacy and /terms — all four are
              that issue's job, not this change's. */}
        </div>

        {/* The Admin link that used to sit at the right of this row is gone.
            The route is properly gated, so this was never an access hole — but
            advertising the back-office entrance to every shopper is attack
            surface bought for nothing, and it reads as an unfinished site. The
            owner reaches /admin by bookmark. */}
        {/* --footer-subtle was lightened during the WCAG pass: at 13px on the
            footer's ink it measured 3.69:1, under the 4.5:1 body minimum.
            --footer-border stays where it is -- a decorative rule, not a
            control boundary, so 1.4.11's 3:1 does not apply to it. */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 text-[13px] text-footer-subtle border-t border-footer-border pt-6 text-center">
          <span>© 2026 Yarns and Buttons. Made by hand, in small batches.</span>
        </div>
      </div>
    </footer>
  );
}
