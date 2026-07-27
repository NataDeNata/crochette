import Image from "next/image";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";
import { ShopMarquee } from "@/components/shop/ShopMarquee";
import { GallerySection } from "@/components/gallery/GallerySection";
import { getProducts } from "@/lib/data/products.server";
import { getHomeGallery } from "@/lib/data/gallery";

export default async function Home() {
  const products = await getProducts();
  const gallery = getHomeGallery();

  return (
    <>
      {/* HERO */}
      <section className="pt-24 px-12 pb-20 relative overflow-hidden">
        <svg
          className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 opacity-60"
          viewBox="0 0 1440 760"
          preserveAspectRatio="none"
        >
          <path
            d="M -40 120 C 220 40, 380 220, 620 130 S 1040 60, 1300 160 S 1520 260, 1480 340"
            fill="none"
            stroke="oklch(0.82 0.05 20)"
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0.5}
          />
          <path
            d="M -60 480 C 180 560, 340 380, 600 470 S 1000 560, 1260 460 S 1500 400, 1500 500"
            fill="none"
            stroke="oklch(0.82 0.05 150)"
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0.45}
          />
          <path
            d="M 100 680 C 320 620, 520 720, 780 660 S 1160 600, 1420 680"
            fill="none"
            stroke="oklch(0.8 0.04 60)"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.4}
          />
          <circle cx={-40} cy={120} r={6} fill="oklch(0.75 0.06 20)" opacity={0.55} />
          <circle cx={-60} cy={480} r={6} fill="oklch(0.75 0.06 150)" opacity={0.5} />
          <circle cx={100} cy={680} r={5} fill="oklch(0.72 0.05 60)" opacity={0.45} />
        </svg>

        <div className="hero-grid grid gap-14 items-center max-w-[1280px] mx-auto relative z-[1]">
          <div>
            <FadeIn>
              <div className="text-[13px] tracking-[3px] uppercase text-[oklch(0.5_0.05_20)] mb-[18px]">
                Handmade crochet decor
              </div>
            </FadeIn>
            <FadeIn delay={0.05}>
              <h1 className="font-serif font-medium text-[clamp(40px,4.5vw,58px)] leading-[1.08] mb-[22px] max-w-[480px]">
                Every stitch, made
                <br />
                with <span className="italic text-[oklch(0.55_0.09_20)]">quiet care</span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p className="text-[17px] text-[oklch(0.42_0.02_60)] max-w-[420px] mb-9 leading-[1.6]">
                Soft amigurumi, flowers, and cozy decor — crocheted by hand, one loop at a time. Custom pieces welcome.
              </p>
            </FadeIn>
            <FadeIn delay={0.15}>
              <div className="flex gap-4">
                <Button href="/shop">Shop the collection</Button>
                <Button href="/custom" variant="outline">
                  Request custom order
                </Button>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.15}>
            <div className="aspect-square rounded-[28px] overflow-hidden relative">
              <Image
                src="https://images.unsplash.com/photo-1605560213808-2c28bcfbc0b8?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1200"
                alt="A handmade crochet bear amigurumi sitting on a wooden table"
                fill
                priority
                sizes="(max-width: 760px) 90vw, 560px"
                className="object-cover"
              />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="pt-20 px-0 pb-25">
        <FadeIn>
          <div className="text-center mb-13 px-12">
            <div className="text-[13px] tracking-[3px] uppercase text-[oklch(0.5_0.05_20)] mb-3">
              Shop
            </div>
            <h2 className="font-serif font-medium text-[40px] m-0">Loved by little rooms</h2>
          </div>
        </FadeIn>
        <FadeIn>
          <ShopMarquee products={products} />
        </FadeIn>
        <div className="text-center mt-14 px-12">
          <Button href="/shop" variant="outline" size="md">
            View full shop →
          </Button>
        </div>
      </section>

      {/* ABOUT TEASER */}
      <section className="py-22.5 px-12 bg-secondary">
        <div className="grid grid-cols-2 gap-16 items-center max-w-[1200px] mx-auto">
          <FadeIn>
            <div className="aspect-[4/5] rounded-[32px] overflow-hidden relative">
              <Image
                src="https://images.unsplash.com/photo-1675510183251-121659ee8b87?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=900"
                alt="Close-up of hands crocheting with yarn"
                fill
                sizes="(max-width: 768px) 90vw, 480px"
                className="object-cover"
              />
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div>
              <div className="text-[13px] tracking-[3px] uppercase text-[oklch(0.5_0.05_20)] mb-3.5">
                About
              </div>
              <h2 className="font-serif font-medium text-4xl mb-5 leading-[1.15]">
                A small studio, made from yarn and patience
              </h2>
              <p className="text-base leading-[1.7] text-[oklch(0.4_0.02_60)] mb-4">
                Crochette began as a way to slow down — turning simple skeins into bears, blossoms, and little
                companions for cozy homes.
              </p>
              <p className="text-base leading-[1.7] text-[oklch(0.4_0.02_60)] m-0">
                Every piece is stitched by hand in small batches, so no two are quite the same.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* GALLERY TEASER */}
      <section className="pt-5 px-12 pb-27.5">
        <div className="max-w-[1320px] mx-auto">
          <FadeIn>
            <div className="text-center mb-13">
              <div className="text-[13px] tracking-[3px] uppercase text-[oklch(0.5_0.05_20)] mb-3">
                Gallery
              </div>
              <h2 className="font-serif font-medium text-[40px] m-0">A peek into the studio</h2>
            </div>
          </FadeIn>
          <GallerySection items={gallery} rowHeight={150} />
        </div>
      </section>
    </>
  );
}
