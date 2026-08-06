import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";
import { CutoutHero } from "@/components/sections/CutoutHero";
import { Cutout } from "@/components/ui/Cutout";
import { GallerySection } from "@/components/gallery/GallerySection";
import { getProducts } from "@/lib/data/products.server";
import { getHomeGallery } from "@/lib/data/gallery";

export default async function Home() {
  const products = await getProducts();
  const gallery = await getHomeGallery();

  return (
    <>
      {/* The stock workshop photograph that used to fill this viewport is gone,
          along with the decorative photograph on the studio panel below. This
          world has no background imagery at all: a photograph appears only
          inside a die-cut window, at the size a buyer needs to judge the piece
          by. The pieces on the sheet are read live from the catalogue, so the
          first viewport is real inventory rather than a chosen still. */}
      <CutoutHero pieces={products.slice(0, 4)} pieceCount={products.length} />

      {/* Below the first viewport the page continues on the same sheet. It used
       * to break into separately framed sheets, each with a viridian margin and
       * a 2px key rule around it; those frames are gone (see Sheet.tsx). The
       * sections still divide, but in the world's own furniture — a ruled
       * colophon across the head of each one — rather than by being boxed.
       *
       * The collection was a draggable Framer marquee. It is a sheet of
       * figures now — the same construction as the hero, which is the whole
       * argument: a drag strip is a different interaction model bolted onto a
       * page whose grammar is "cut this out", and it was also the single
       * reason `body { overflow-x: hidden }` had to stay, which in turn made
       * the standard overflow check read clean for ten days while every phone
       * width was overflowing. */}
      <section className="bg-sheet">
        <div className="page-gutter pb-16 pt-10 sm:pb-20">
          <div className="max-w-[1320px] mx-auto">
            <FadeIn>
              <h2 className="type-sheet-display text-[clamp(30px,4.4vw,52px)] text-balance max-w-[620px] mb-10">
                Everything currently available
              </h2>
            </FadeIn>

            <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-4 lg:gap-x-10">
              {products.slice(0, 8).map((product) => (
                <Cutout key={product.id} product={product} />
              ))}
            </div>

            <div className="mt-14">
              <Button href="/shop" variant="outline" size="md">
                See the full collection
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* The studio. The stock close-up of hands that sat beside this copy is
          deleted rather than restyled: it was atmosphere, and this world only
          prints photographs that are evidence of a piece for sale.

          The hairline above it is the only thing dividing this section from the
          collection now that neither is boxed. It is drawn *inside* the gutter,
          at the content's own width, so it reads as a rule on the sheet rather
          than as an edge of the page — the distinction the whole frame removal
          turns on. Deliberately a hairline in the keyline at low alpha rather
          than the 2px key used for a colophon rule: this divides, it does not
          announce a new artifact. */}
      <section className="bg-sheet">
        <div className="page-gutter pb-16 pt-4 sm:pb-20 sm:pt-6">
          <div className="max-w-[1320px] mx-auto mb-14 border-t border-keyline/15 sm:mb-16" />
          <div className="max-w-[1320px] mx-auto grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-20">
            <h2 className="type-sheet-display text-[clamp(26px,3.4vw,42px)] text-balance">
              One person, a hook, and a lot of patience
            </h2>
            <div>
              <p className="text-[17px] leading-[1.7] text-muted-foreground mb-4 max-w-[65ch]">
                Crochette began as a way to slow down: turning simple skeins into bears,
                blossoms and little companions for cozy homes.
              </p>
              <p className="text-[17px] leading-[1.7] text-muted-foreground max-w-[65ch]">
                Every piece is stitched by hand in small batches, so no two are quite the
                same. That is the honest version of handmade, and the reason nothing here
                is ever an exact copy of its photograph.
              </p>
            </div>
          </div>
        </div>
      </section>

      {gallery.length > 0 && (
        <section className="bg-sheet">
          <div className="page-gutter pb-16 pt-4 sm:pb-20 sm:pt-6">
            <div className="max-w-[1320px] mx-auto mb-14 border-t border-keyline/15 sm:mb-16" />
            <div className="max-w-[1320px] mx-auto">
              <FadeIn>
                <h2 className="type-sheet-display text-[clamp(26px,3.4vw,42px)] text-balance mb-10">
                  Inside the studio
                </h2>
              </FadeIn>
              <GallerySection items={gallery} rowHeight={150} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
