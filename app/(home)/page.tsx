import Image from "next/image";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";
import { ShopMarquee } from "@/components/shop/ShopMarquee";
import { GallerySection } from "@/components/gallery/GallerySection";
import { getProducts } from "@/lib/data/products.server";
import { getHomeGallery } from "@/lib/data/gallery";

export default async function Home() {
  const products = await getProducts();
  const gallery = await getHomeGallery();

  return (
    <>
      {/* HERO */}
      {/* `svh`, not `vh`: on mobile browsers `100vh` is the *largest* viewport
          (toolbars retracted), so a `100vh` hero always starts out taller than
          the visible area and pushes its own CTAs under the browser chrome.
          `svh` is the small-viewport unit — the one that means "fits with the
          toolbars showing". `--nav-h` replaces the hardcoded 89px. */}
      <section className="relative overflow-hidden min-h-[calc(100svh-var(--nav-h))] flex items-center page-gutter py-16 sm:py-24">
        <Image
          src="https://images.unsplash.com/photo-1605560213808-2c28bcfbc0b8?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=2400"
          alt="A handmade crochet bear amigurumi sitting on a wooden table"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />

        <div className="absolute inset-0 bg-linear-to-r from-[oklch(0.22_0.02_60/0.85)] via-[oklch(0.22_0.02_60/0.5)] to-[oklch(0.22_0.02_60/0.15)]" />

        {/* Desktop only. `preserveAspectRatio="none"` stretches this 1440x760
            artwork to whatever box it lands in, and the text mask is a rect
            positioned for the desktop copy column — in portrait the yarn lines
            smear vertically and the mask sits over the wrong region entirely.
            Purely decorative and already pointer-events-none, so dropping it
            below `md` costs nothing. */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-[1] hidden md:block"
          viewBox="0 0 1440 760"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="hero-line-mask-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="36" />
            </filter>
            <mask id="hero-line-text-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1440" height="760">
              <rect x="0" y="0" width="1440" height="760" fill="white" />
              <rect x="-80" y="70" width="700" height="470" rx="30" fill="black" filter="url(#hero-line-mask-blur)" />
            </mask>
          </defs>
          <g className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]" mask="url(#hero-line-text-mask)">
            <path
              d="M -40 120 C 220 40, 380 220, 620 130 S 1040 60, 1300 160 S 1520 260, 1480 340"
              fill="none"
              stroke="oklch(0.97 0.015 80)"
              strokeWidth={2.5}
              strokeLinecap="round"
              opacity={0.32}
            />
            <path
              d="M -60 480 C 180 560, 340 380, 600 470 S 1000 560, 1260 460 S 1500 400, 1500 500"
              fill="none"
              stroke="oklch(0.97 0.015 80)"
              strokeWidth={2.5}
              strokeLinecap="round"
              opacity={0.26}
            />
            <path
              d="M 100 680 C 320 620, 520 720, 780 660 S 1160 600, 1420 680"
              fill="none"
              stroke="oklch(0.97 0.015 80)"
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.22}
            />
            <circle cx={-40} cy={120} r={6} fill="oklch(0.97 0.015 80)" opacity={0.32} />
            <circle cx={-60} cy={480} r={6} fill="oklch(0.97 0.015 80)" opacity={0.28} />
            <circle cx={100} cy={680} r={5} fill="oklch(0.97 0.015 80)" opacity={0.25} />
          </g>
        </svg>

        <div className="max-w-[1280px] mx-auto relative z-[2] w-full">
          {/* The -100px lift is a desktop composition device; on a short screen
              it drags the eyebrow up behind the sticky nav. */}
          <div className="max-w-[480px] md:-translate-y-[100px]">
            <FadeIn>
              <div className="text-[14px] tracking-[3px] uppercase text-[oklch(0.92_0.02_75)] mb-[18px]">
                Handmade crochet decor
              </div>
            </FadeIn>
            <FadeIn delay={0.05}>
              <h1 className="font-serif font-medium text-[clamp(34px,5.2vw,66px)] leading-[1.08] mb-[22px] text-[oklch(0.99_0.005_85)]">
                Every stitch, made
                <br />
                with <span className="italic text-[oklch(0.88_0.07_20)]">quiet care</span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p className="text-[17px] sm:text-[19px] text-[oklch(0.92_0.015_75)] max-w-[420px] mb-9 leading-[1.6]">
                Soft amigurumi, flowers, and cozy decor — crocheted by hand, one loop at a time. Custom pieces welcome.
              </p>
            </FadeIn>
            <FadeIn delay={0.15}>
              {/* Side by side these two need ~435px; a 320px screen has 280.
                  Stacked full-width below `sm`. */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button href="/shop" className="w-full sm:w-auto">
                  Shop the collection
                </Button>
                <Button
                  href="/custom"
                  variant="outline"
                  className="w-full sm:w-auto border-white/70 text-white hover:bg-white/10 hover:border-white"
                >
                  Request custom order
                </Button>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="relative overflow-x-hidden py-16 sm:py-24 px-0 flex items-center md:min-h-[calc(100svh-var(--nav-h))]">
        <Image
          src="https://images.unsplash.com/photo-1649680954447-cb65a40755a8?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=80&w=2400"
          alt="A shelf of wound yarn skeins in soft colors"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[oklch(0.22_0.02_60/0.58)]" />

        <div className="relative z-[1] w-full">
          <FadeIn>
            <div className="text-center mb-13 page-gutter">
              <div className="text-[14px] tracking-[3px] uppercase text-[oklch(0.92_0.02_75)] mb-3">
                Shop
              </div>
              <h2 className="font-serif font-medium text-[clamp(30px,5vw,52px)] m-0 text-[oklch(0.99_0.005_85)]">
                Loved by little rooms
              </h2>
            </div>
          </FadeIn>
          <FadeIn>
            <ShopMarquee products={products} onDark />
          </FadeIn>
          <div className="text-center mt-14 page-gutter">
            <Button
              href="/shop"
              variant="outline"
              size="md"
              className="border-white/70 text-white hover:bg-white/10 hover:border-white"
            >
              View full shop →
            </Button>
          </div>
        </div>
      </section>

      {/* ABOUT TEASER */}
      <section className="relative overflow-hidden min-h-[480px] md:min-h-[calc(100svh-var(--nav-h))] flex items-center page-gutter py-16 sm:py-22.5">
        <Image
          src="https://images.unsplash.com/photo-1675510183251-121659ee8b87?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=2400"
          alt="Close-up of hands crocheting with yarn"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-l from-[oklch(0.22_0.02_60/0.85)] via-[oklch(0.22_0.02_60/0.5)] to-[oklch(0.22_0.02_60/0.15)]" />

        <div className="max-w-[1200px] mx-auto relative z-[1] w-full">
          <FadeIn delay={0.1}>
            <div className="max-w-[460px] ml-auto">
              <div className="text-[14px] tracking-[3px] uppercase text-[oklch(0.92_0.02_75)] mb-3.5">
                About
              </div>
              <h2 className="font-serif font-medium text-[32px] sm:text-5xl mb-5 leading-[1.15] text-[oklch(0.99_0.005_85)]">
                A small studio, made from yarn and patience
              </h2>
              <p className="text-lg leading-[1.7] text-[oklch(0.92_0.015_75)] mb-4">
                Crochette began as a way to slow down — turning simple skeins into bears, blossoms, and little
                companions for cozy homes.
              </p>
              <p className="text-lg leading-[1.7] text-[oklch(0.92_0.015_75)] m-0">
                Every piece is stitched by hand in small batches, so no two are quite the same.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* GALLERY TEASER */}
      {gallery.length > 0 && (
        <section className="pt-5 page-gutter pb-27.5">
          <div className="max-w-[1320px] mx-auto">
            <FadeIn>
              <div className="text-center mb-13">
                <div className="text-[14px] tracking-[3px] uppercase text-[oklch(0.5_0.05_20)] mb-3">
                  Gallery
                </div>
                <h2 className="font-serif font-medium text-[clamp(30px,5vw,52px)] m-0">A peek into the studio</h2>
              </div>
            </FadeIn>
            <GallerySection items={gallery} rowHeight={150} />
          </div>
        </section>
      )}
    </>
  );
}
