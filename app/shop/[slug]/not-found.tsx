import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";

export default function ProductNotFound() {
  return (
    <section className="py-[100px] px-12 text-center">
      <FadeIn>
        <div className="text-[13px] tracking-[3px] uppercase text-[oklch(0.5_0.05_20)] mb-4">
          Shop
        </div>
        <h1 className="font-serif font-medium text-[clamp(32px,4vw,46px)] mb-4">
          We couldn&apos;t find that piece
        </h1>
        <p className="text-[15.5px] text-[oklch(0.42_0.02_60)] max-w-[420px] mx-auto mb-8 leading-[1.6]">
          It may have sold out or been renamed. Take a look at the full collection instead.
        </p>
        <Button href="/shop">Back to shop</Button>
      </FadeIn>
    </section>
  );
}
