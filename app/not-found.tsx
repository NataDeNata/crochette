import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";

/** Root 404. Serves every mistyped URL plus the six `notFound()` call sites
 * that had no matching file of their own (admin order/product/discount/image
 * detail pages and /order/[id]) — those previously fell through to Next's
 * unstyled default. /shop/[slug] keeps its own more specific version. */
export default function NotFound() {
  return (
    <section className="py-[100px] px-12 text-center">
      <FadeIn>
        <div className="text-[13px] tracking-[3px] uppercase text-[oklch(0.5_0.05_20)] mb-4">404</div>
        <h1 className="font-serif font-medium text-[clamp(32px,4vw,46px)] mb-4">
          This page doesn&apos;t exist
        </h1>
        <p className="text-[15.5px] text-[oklch(0.42_0.02_60)] max-w-[420px] mx-auto mb-8 leading-[1.6]">
          The link may be out of date, or the page may have moved. Start from the collection instead.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button href="/shop">Browse the shop</Button>
          <Button href="/" variant="outline">
            Home
          </Button>
        </div>
      </FadeIn>
    </section>
  );
}
