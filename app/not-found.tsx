import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";

/** Root 404. Serves every mistyped URL plus the six `notFound()` call sites
 * that had no matching file of their own (admin order/product/discount/image
 * detail pages and /order/[id]) — those previously fell through to Next's
 * unstyled default. /shop/[slug] keeps its own more specific version. */

/* The title used to be the root default — so a 404 announced itself in the tab
 * and in a bookmark as "Crochette | Handmade crochet decor", indistinguishable
 * from the homepage. `noindex` alongside it: this page answers 404, but saying
 * so in the metadata costs nothing and covers the streamed-status case this
 * project has already been bitten by once. */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section className="py-[100px] page-gutter text-center">
      <FadeIn>
        {/* Repainted onto the sheet's own tokens and type. These were the last
            hardcoded oklch literals and the last `font-serif` on the
            storefront — a leftover from the palette before the cream repaint,
            which is why this page alone did not follow it. */}
        <div className="type-sheet-spec text-press-red mb-4">404</div>
        <h1 className="type-sheet-display text-keyline text-[clamp(32px,4vw,46px)] mb-4">
          This page doesn&apos;t exist
        </h1>
        <p className="text-[15.5px] text-muted-foreground max-w-[420px] mx-auto mb-8 leading-[1.6]">
          The link may be out of date, or the page may have moved. Start from the collection instead.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button href="/shop">Browse the shop</Button>
          <Button href="/" variant="outline">
            Home
          </Button>
        </div>
      </FadeIn>
    </section>
  );
}
