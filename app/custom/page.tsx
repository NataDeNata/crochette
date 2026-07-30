import type { Metadata } from "next";
import { FadeIn } from "@/components/motion/FadeIn";
import { CustomOrderPanel } from "@/components/custom/CustomOrderPanel";
import { StepThread } from "@/components/custom/StepThread";
import { CUSTOM_STEPS } from "@/lib/data/custom";

export const metadata: Metadata = {
  title: "Custom Orders",
  description: "Tell us the size, colors, and character — we'll turn it into a one-of-a-kind piece.",
  openGraph: {
    title: "Custom Orders — Crochette",
    description: "Tell us the size, colors, and character — we'll turn it into a one-of-a-kind piece.",
  },
};

export default function CustomOrderPage() {
  return (
    <>
      <section className="pt-12 sm:pt-[72px] page-gutter pb-14 text-center">
        <FadeIn>
          <div className="text-[13px] tracking-[3px] uppercase text-[oklch(0.5_0.05_20)] mb-4">
            Custom orders
          </div>
          <h1 className="font-serif font-medium text-[clamp(32px,5vw,58px)] mb-4">
            Have something in mind?
          </h1>
          <p className="text-base text-[oklch(0.42_0.02_60)] max-w-[480px] mx-auto leading-[1.6]">
            Tell us the size, colors, and character — we&apos;ll turn it into a one-of-a-kind piece, made just for
            you.
          </p>
        </FadeIn>
      </section>

      <section className="relative page-gutter pb-[90px] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 max-w-[1000px] mx-auto">
        <StepThread />
        {CUSTOM_STEPS.map((s, i) => (
          <FadeIn key={s.n} delay={i * 0.08}>
            <div className="text-center px-3">
              <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center font-serif text-[18px] font-semibold mx-auto mb-3.5">
                {s.n}
              </div>
              <div className="text-[15px] font-semibold mb-2">{s.title}</div>
              <div className="text-[13.5px] leading-[1.6] text-[oklch(0.45_0.02_60)]">{s.body}</div>
            </div>
          </FadeIn>
        ))}
      </section>

      <FadeIn>
        {/* Form + live preview. Stacked below `md`: at 320px the old flat
            `1.1fr 1fr` inside `p-14` left each column about 92px wide. */}
        <section className="mx-4 sm:mx-8 mb-[100px] p-6 sm:p-10 md:p-14 rounded-[28px] sm:rounded-[36px] bg-accent grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-8 md:gap-14 items-center">
          <CustomOrderPanel />
        </section>
      </FadeIn>
    </>
  );
}
