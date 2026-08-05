import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";
import { ShopGrid } from "@/components/shop/ShopGrid";
import { getProducts } from "@/lib/data/products.server";

export const metadata: Metadata = {
  title: "Shop",
  description: "Amigurumi, flowers, and cozy decor — every piece made by hand, in small batches.",
  openGraph: {
    title: "Shop — Crochette",
    description: "Amigurumi, flowers, and cozy decor — every piece made by hand, in small batches.",
  },
};

export default async function ShopPage() {
  const products = await getProducts();

  return (
    <>
      {/* No eyebrow above the heading. The old "SHOP" kicker sat over a page
          whose URL, nav state and heading all already said shop; the heading
          carries it alone. */}
      <section className="pt-12 sm:pt-[72px] page-gutter pb-10">
        <FadeIn>
          <div className="max-w-[1320px] mx-auto">
            <h1 className="type-akari-display text-[clamp(32px,5vw,58px)] text-ink text-balance mb-5">
              The full collection
            </h1>
            <p className="text-[17px] text-muted-foreground max-w-[520px] leading-[1.7]">
              Amigurumi, flowers and cozy decor. Every piece made by hand, in small
              batches.
            </p>
          </div>
        </FadeIn>
      </section>

      <ShopGrid products={products} />

      <FadeIn>
        {/* The commission hand-off, as the one unworked cell at the end of the
            chart — madder-deep, which carries raw wool at 5.1:1. */}
        <section className="page-gutter mb-[100px]">
          <div className="max-w-[1320px] mx-auto bg-paper rounded-lg border border-border p-8 sm:p-14">
            <h2 className="type-akari-display text-[clamp(24px,3.2vw,38px)] text-ink text-balance mb-4 max-w-[520px]">
              Don&apos;t see quite what you want?
            </h2>
            <p className="text-[16px] leading-[1.7] text-muted-foreground mb-8 max-w-[460px]">
              We chart custom pieces too — any colour, size or character. Tell us what
              you have in mind and we&apos;ll come back with a price.
            </p>
            <Button href="/custom">Request a custom order</Button>
          </div>
        </section>
      </FadeIn>
    </>
  );
}
