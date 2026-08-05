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
      <section className="pt-12 sm:pt-[72px] page-gutter pb-14">
        <FadeIn>
          <div className="max-w-[1000px] mx-auto">
            <h1 className="type-akari-display text-[clamp(32px,5vw,58px)] text-ink text-balance mb-5">
              Have something in mind?
            </h1>
            <p className="text-[17px] text-muted-foreground max-w-[540px] leading-[1.7]">
              Tell us the size, colours and character. We&apos;ll chart it, price it, and
              make it just for you.
            </p>
          </div>
        </FadeIn>
      </section>

      <section className="relative page-gutter pb-[90px] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 max-w-[1000px] mx-auto">
        <StepThread />
        {CUSTOM_STEPS.map((s, i) => (
          <FadeIn key={s.n} delay={i * 0.08}>
            {/* The step numbers stay. Craft-floor treats 01/02/03 as a default
                to refuse, but the exception it names applies exactly here: this
                is a process you go through in order, so the sequence is the
                information, not decoration around it. Set as a small charcoal
                tile, matching the board's primary fill. */}
            <div className="px-1">
              <div className="size-10 rounded-lg bg-ink text-washi flex items-center justify-center type-akari-label mb-4">
                {s.n}
              </div>
              <div className="text-[15px] font-semibold mb-2 text-ink">{s.title}</div>
              <div className="text-[14px] leading-[1.65] text-muted-foreground">{s.body}</div>
            </div>
          </FadeIn>
        ))}
      </section>

      <FadeIn>
        {/* Form + live preview. Stacked below `md`: at 320px the old flat
            `1.1fr 1fr` inside `p-14` left each column about 92px wide. */}
        <section className="page-gutter mb-[100px]">
          <div className="max-w-[1320px] mx-auto bg-card rounded-lg border border-border p-6 sm:p-10 md:p-14 grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-8 md:gap-14 items-start">
            <CustomOrderPanel />
          </div>
        </section>
      </FadeIn>
    </>
  );
}
