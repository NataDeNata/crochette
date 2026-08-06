import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";
import { ShopGrid } from "@/components/shop/ShopGrid";
import { getProducts } from "@/lib/data/products.server";

export const metadata: Metadata = {
  title: "Shop",
  description: "Amigurumi, flowers, and cozy decor. Every piece made by hand, in small batches.",
  openGraph: {
    title: "Shop | Crochette",
    description: "Amigurumi, flowers, and cozy decor. Every piece made by hand, in small batches.",
  },
};

export default async function ShopPage() {
  const products = await getProducts();

  return (
    <>
      {/* The heading, masthead and controls all live inside ShopGrid now. The
          sheet number is derived from the current page, which is client state,
          so the title block has to sit where that state does — splitting it
          across two components is how the masthead ends up claiming No. 01 on
          sheet three. */}
      <ShopGrid products={products} />

      {/* The commission hand-off: the figure that is not printed on any of the
          sheets above, divided off by a rule on the sheet rather than by a box
          around itself. */}
      <FadeIn>
        <section className="bg-sheet">
          <div className="page-gutter pb-14 pt-4 sm:pb-16 sm:pt-6">
            <div className="max-w-[1320px] mx-auto mb-14 border-t border-keyline/15" />
            <div className="max-w-[1320px] mx-auto grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <h2 className="type-sheet-display text-[clamp(26px,3.6vw,44px)] text-keyline text-balance max-w-[16ch]">
                  Don&apos;t see quite what you want?
                </h2>
                <p className="text-[16px] leading-[1.7] text-muted-foreground mt-4 max-w-[52ch]">
                  We make custom pieces too, in any colour, size or character. Tell us
                  what you have in mind and we&apos;ll come back with a price.
                </p>
              </div>
              <Button href="/custom">Request a custom order</Button>
            </div>
          </div>
        </section>
      </FadeIn>
    </>
  );
}
