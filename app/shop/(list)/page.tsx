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
      <section className="pt-12 sm:pt-[72px] page-gutter pb-10 text-center">
        <FadeIn>
          <div className="text-[13px] tracking-[3px] uppercase text-[oklch(0.5_0.05_20)] mb-4">
            Shop
          </div>
          <h1 className="font-serif font-medium text-[clamp(32px,5vw,58px)] mb-4">
            The full collection
          </h1>
          <p className="text-base text-[oklch(0.42_0.02_60)] max-w-[460px] mx-auto leading-[1.6]">
            Amigurumi, flowers, and cozy decor — every piece made by hand, in small batches.
          </p>
        </FadeIn>
      </section>

      <ShopGrid products={products} />

      <FadeIn>
        <section className="mx-4 sm:mx-8 mb-[100px] py-10 sm:py-14 px-6 sm:px-12 rounded-[28px] sm:rounded-[36px] bg-accent text-center">
          <h2 className="font-serif font-medium text-3xl mb-3.5">
            Don&apos;t see quite what you want?
          </h2>
          <p className="text-[15px] text-[oklch(0.32_0.03_20)] mb-6">
            We make custom pieces too — any color, size, or character.
          </p>
          <Button href="/custom">Request a custom order</Button>
        </section>
      </FadeIn>
    </>
  );
}
