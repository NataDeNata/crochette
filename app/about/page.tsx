import type { Metadata } from "next";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";
import { VALUES } from "@/lib/data/about";

export const metadata: Metadata = {
  title: "About",
  description: "A small studio, made from yarn and patience.",
  openGraph: {
    title: "About — Crochette",
    description: "A small studio, made from yarn and patience.",
  },
};

export default function AboutPage() {
  return (
    <>
      <section className="pt-12 md:pt-20 page-gutter pb-16 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
        <FadeIn>
          <div>
            <div className="text-[13px] tracking-[3px] uppercase text-[oklch(0.5_0.05_20)] mb-3.5">
              About
            </div>
            <h1 className="font-serif font-medium text-[clamp(34px,4.4vw,50px)] mb-[22px] leading-[1.12]">
              A small studio, made from yarn and patience
            </h1>
            <p className="text-base leading-[1.75] text-[oklch(0.4_0.02_60)] mb-4">
              Crochette began as a way to slow down — turning simple skeins into bears, blossoms, and little
              companions for cozy homes.
            </p>
            <p className="text-base leading-[1.75] text-[oklch(0.4_0.02_60)] m-0">
              What started as a hobby on quiet evenings grew into a small studio, still run the same way: one hook,
              one skein, one piece at a time.
            </p>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          {/* The same photo as the home page's About teaser, so the two
              tellings of this story share a face. The two columns stack below
              `md`, so the image is full-bleed there and half the grid above —
              which is what `sizes` has to describe, or Next serves a
              half-width source into a full-width slot on every phone. */}
          <div className="relative aspect-[4/5] rounded-[32px] overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1675510183251-121659ee8b87?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1600"
              alt="Close-up of hands crocheting with yarn"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </FadeIn>
      </section>

      <section className="pt-5 page-gutter pb-[100px]">
        <FadeIn>
          <div className="text-center mb-12">
            <div className="text-[13px] tracking-[3px] uppercase text-[oklch(0.5_0.05_20)] mb-3">
              Our values
            </div>
            <h2 className="font-serif font-medium text-[34px] m-0">What we believe in</h2>
          </div>
        </FadeIn>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-8">
          {VALUES.map((v, i) => (
            <FadeIn key={v.title} delay={i * 0.08}>
              <div className={`py-9 px-7 rounded-[24px] ${v.bgClassName}`}>
                <div className="font-serif italic text-[26px] mb-3">
                  {v.title}
                </div>
                <p className="text-sm leading-[1.65] text-[oklch(0.35_0.03_60)] m-0">{v.body}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      <FadeIn>
        <section className="mx-4 sm:mx-8 mb-[100px] py-10 sm:py-14 px-6 sm:px-12 rounded-[28px] sm:rounded-[36px] bg-accent text-center">
          <h2 className="font-serif font-medium text-3xl mb-3.5">
            Want to see it in your home?
          </h2>
          <p className="text-[15px] text-[oklch(0.32_0.03_20)] mb-6">
            Browse the collection or tell us what you&apos;re dreaming up.
          </p>
          {/* Side by side these two overrun a 320px card by ~160px, so they
              stack into full-width rows below `sm`. */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button href="/shop" className="w-full sm:w-auto">
              Shop the collection
            </Button>
            <Button href="/custom" variant="outline" className="w-full sm:w-auto">
              Request custom order
            </Button>
          </div>
        </section>
      </FadeIn>
    </>
  );
}
