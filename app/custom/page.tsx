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
      <section className="pt-[72px] px-12 pb-14 text-center">
        <FadeIn>
          <div className="text-[13px] tracking-[3px] uppercase text-[oklch(0.5_0.05_20)] mb-4">
            Custom orders
          </div>
          <h1 className="font-serif font-medium text-[clamp(38px,5vw,58px)] mb-4">
            Have something in mind?
          </h1>
          <p className="text-base text-[oklch(0.42_0.02_60)] max-w-[480px] mx-auto leading-[1.6]">
            Tell us the size, colors, and character — we&apos;ll turn it into a one-of-a-kind piece, made just for
            you.
          </p>
        </FadeIn>
      </section>

      <section className="relative px-12 pb-[90px] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 max-w-[1000px] mx-auto">
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
        <section className="mx-8 mb-[100px] p-14 rounded-[36px] bg-accent grid grid-cols-[1.1fr_1fr] gap-14 items-center">
          <CustomOrderPanel />
        </section>
      </FadeIn>
    </>
  );
}
