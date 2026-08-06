import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";
import { Sheet } from "@/components/layout/Sheet";
import { VALUES } from "@/lib/data/about";

export const metadata: Metadata = {
  title: "About",
  description: "A small studio, made from yarn and patience.",
  openGraph: {
    title: "About | Crochette",
    description: "A small studio, made from yarn and patience.",
  },
};

export default function AboutPage() {
  return (
    <>
      {/* The stock photograph of anonymous hands that sat beside this copy is
          deleted, not restyled — the same call as the home page's studio
          panel. It was atmosphere, this world prints photographs only as
          evidence of a piece for sale, and it was stock rather than the
          owner's own work, which makes it the weakest kind of proof.

          The two "About" / "Our values" kickers are gone as well: the craft
          floor bans them outright and each heading below carries itself. */}
      <Sheet innerClassName="py-10 sm:py-14 lg:py-16">
        <div className="max-w-[1320px] mx-auto">
          <FadeIn>
            <h1 className="type-sheet-display text-[clamp(34px,5.4vw,66px)] text-keyline text-balance mt-8 max-w-[15ch]">
              A small studio, made from yarn and patience
            </h1>
            <div className="mt-8 grid gap-6 md:grid-cols-2 md:gap-14">
              <p className="text-[17px] leading-[1.7] text-muted-foreground max-w-[58ch]">
                Crochette began as a way to slow down, turning simple skeins into
                bears, blossoms, and little companions for cozy homes.
              </p>
              <p className="text-[17px] leading-[1.7] text-muted-foreground max-w-[58ch]">
                What started as a hobby on quiet evenings grew into a small studio,
                still run the same way: one hook, one skein, one piece at a time.
              </p>
            </div>
          </FadeIn>
        </div>
      </Sheet>

      <Sheet innerClassName="py-10 sm:py-14 lg:py-16">
        <div className="max-w-[1320px] mx-auto">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-6">
            {VALUES.map((v, i) => (
              <FadeIn key={v.title} delay={i * 0.08}>
                {/* Keyline plates, not tinted cards. The per-value background
                    classes are dropped: they were cream-family tints with no
                    relationship to this palette, and colour-coding three
                    equal-weight statements said something untrue about them. */}
                <div className="h-full border-2 border-keyline p-7">
                  <div className="type-sheet-display text-[24px] text-keyline mb-3">
                    {v.title}
                  </div>
                  <p className="text-[15px] leading-[1.65] text-muted-foreground">
                    {v.body}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </Sheet>

      <FadeIn>
        <Sheet innerClassName="py-14 sm:py-16">
          <div className="max-w-[1320px] mx-auto grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2 className="type-sheet-display text-[clamp(26px,3.6vw,44px)] text-keyline text-balance max-w-[16ch]">
                Want to see it in your home?
              </h2>
              <p className="text-[16px] leading-[1.7] text-muted-foreground mt-4 max-w-[52ch]">
                Browse the collection or tell us what you&apos;re dreaming up.
              </p>
            </div>
            {/* Side by side these two overrun a 320px column, so they stack
                into full-width rows below `sm`. */}
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Button href="/shop" className="w-full sm:w-auto">
                Shop the collection
              </Button>
              <Button href="/custom" variant="outline" className="w-full sm:w-auto">
                Request custom order
              </Button>
            </div>
          </div>
        </Sheet>
      </FadeIn>
    </>
  );
}
