import type { Metadata } from "next";
import { FadeIn } from "@/components/motion/FadeIn";
import { CustomOrderPanel } from "@/components/custom/CustomOrderPanel";
import { StepThread } from "@/components/custom/StepThread";
import { CUSTOM_STEPS } from "@/lib/data/custom";
import { OG_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Custom Orders",
  description: "Tell us the size, colors, and character, and we'll turn it into a one-of-a-kind piece.",
  alternates: { canonical: "/custom" },
  openGraph: {
    title: "Custom Orders | Crochette",
    description: "Tell us the size, colors, and character, and we'll turn it into a one-of-a-kind piece.",
    images: [OG_IMAGE],
  },
};

export default function CustomOrderPage() {
  return (
    <>
      <section className="bg-sheet">
        <div className="page-gutter py-8 sm:py-10 lg:py-12">
          <div className="max-w-[1320px] mx-auto">
            <FadeIn>
              <h1 className="type-sheet-display text-[clamp(34px,5.4vw,66px)] text-keyline text-balance max-w-[16ch]">
                Have something in mind?
              </h1>
              <p className="text-[17px] text-muted-foreground max-w-[52ch] leading-[1.7] mt-5">
                Tell us the size, colours and character. We&apos;ll chart it, price it,
                and make it just for you.
              </p>
            </FadeIn>

            {/* The steps. Numbers stay: the craft floor treats 01/02/03 as a
                default to refuse, and names the exception that applies exactly
                here — this is a process you go through in order, so the
                sequence is the information rather than decoration around it.
                Set as keyline plates in the sheet's own construction. */}
            <div className="relative mt-14 grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-8">
              <StepThread />
              {CUSTOM_STEPS.map((s, i) => (
                <FadeIn key={s.n} delay={i * 0.08}>
                  <div className="type-sheet-display mb-4 flex size-11 items-center justify-center border-2 border-keyline bg-butter text-[18px] text-keyline">
                    {s.n}
                  </div>
                  <div className="type-sheet-display mb-2 text-[19px] text-keyline">
                    {s.title}
                  </div>
                  <div className="text-[14px] leading-[1.65] text-muted-foreground max-w-[42ch]">
                    {s.body}
                  </div>
                </FadeIn>
              ))}
            </div>

            {/* Form on the left, the unprinted figure on the right. Stacked
                below `md`: at 320px a flat `1.1fr 1fr` left each column about
                92px wide. */}
            <div className="mt-16 grid grid-cols-1 gap-10 border-t-2 border-keyline pt-12 md:grid-cols-[1.1fr_1fr] md:gap-14 items-start">
              <CustomOrderPanel />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
