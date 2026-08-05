import Image from "next/image";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";
import { WorkshopHero } from "@/components/sections/WorkshopHero";
import { PaperBand } from "@/components/sections/PaperBand";
import { ShopMarquee } from "@/components/shop/ShopMarquee";
import { GallerySection } from "@/components/gallery/GallerySection";
import { getProducts } from "@/lib/data/products.server";
import { getHomeGallery } from "@/lib/data/gallery";

export default async function Home() {
  const products = await getProducts();
  const gallery = await getHomeGallery();

  return (
    <>
      <WorkshopHero
        imageSrc="https://images.unsplash.com/photo-1605560213808-2c28bcfbc0b8?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=2400"
        imageAlt="A handmade crochet bear amigurumi sitting on a wooden table"
        pieceCount={products.length}
      />

      {/* From here the page is a stack of sheets, each one bowing over the last.
       * Every section alternates washi and paper so the curve between them has
       * two tones to separate — a band drawn between two identical grounds is
       * just a decorative swoosh, and this world does not do decoration.
       *
       * The collection gets a sheet of its own so the card row sits on the bow
       * rather than floating above a flat edge. Chrome stays deliberately quiet:
       * the pieces are the only saturated thing on the page. */}
      <PaperBand fill="var(--paper)" className="bg-washi" />
      <section className="bg-paper pt-4 pb-20 sm:pb-28 overflow-x-hidden">
        <FadeIn>
          <div className="page-gutter mb-10 max-w-[1320px] mx-auto">
            <h2 className="type-akari-display text-[clamp(28px,4vw,46px)] text-balance max-w-[560px]">
              The collection
            </h2>
          </div>
        </FadeIn>
        <FadeIn>
          <ShopMarquee products={products} />
        </FadeIn>
        <div className="page-gutter mt-12 max-w-[1320px] mx-auto">
          <Button href="/shop" variant="outline" size="md">
            See everything
          </Button>
        </div>
      </section>

      {/* The studio, back on washi. */}
      <PaperBand fill="var(--washi)" className="bg-paper" />
      <section className="bg-washi page-gutter pb-20 sm:pb-28 pt-4">
        <div className="max-w-[1320px] mx-auto grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20 items-center">
          <div>
            <h2 className="type-akari-display text-[clamp(26px,3.4vw,42px)] text-balance mb-6">
              One person, a hook, and a lot of patience
            </h2>
            <p className="text-[17px] leading-[1.75] text-muted-foreground mb-4">
              Crochette began as a way to slow down: turning simple skeins into bears,
              blossoms and little companions for cozy homes.
            </p>
            <p className="text-[17px] leading-[1.75] text-muted-foreground">
              Every piece is stitched by hand in small batches, so no two are quite the
              same. That is the honest version of handmade — and the reason nothing here
              is ever an exact copy of its photograph.
            </p>
          </div>

          <div className="relative aspect-4/3 rounded-lg overflow-hidden border border-border">
            <Image
              src="https://images.unsplash.com/photo-1675510183251-121659ee8b87?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1600"
              alt="Close-up of hands crocheting with yarn"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>
      <PaperBand fill="var(--paper)" className="bg-washi" />

      {gallery.length > 0 && (
        <section className="bg-paper page-gutter pb-28 pt-6">
          <div className="max-w-[1320px] mx-auto">
            <FadeIn>
              <h2 className="type-akari-display text-[clamp(26px,3.4vw,42px)] text-balance mb-10">
                Inside the studio
              </h2>
            </FadeIn>
            <GallerySection items={gallery} rowHeight={150} />
          </div>
        </section>
      )}
    </>
  );
}
