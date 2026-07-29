import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/data/products";

/**
 * Lives in the (list) route group so it covers /shop only.
 *
 * At app/shop/loading.tsx it was also the nearest ancestor for /shop/[slug],
 * which wrapped every product page in a Suspense boundary — making a missing
 * slug stream a 200 instead of a 404, and flashing a grid of card skeletons
 * while loading a single product. The group scopes it to the listing;
 * /shop is unchanged as a URL.
 */

// ShopGrid.tsx's PAGE_SIZE — the first page always renders this many cards.
const CARD_COUNT = 9;

// Rough width tiers so pill skeletons roughly track real label lengths
// ("All" vs "Home decor") without needing to render/measure text.
const PILL_WIDTHS = ["w-12", "w-28", "w-20", "w-32", "w-24"];

export default function ShopLoading() {
  return (
    <>
      <section className="pt-[72px] px-12 pb-10 text-center">
        <Skeleton className="h-[13px] w-16 mx-auto mb-4 rounded-full" />
        <Skeleton className="h-[46px] w-80 max-w-full mx-auto mb-4" />
        <Skeleton className="h-4 w-[420px] max-w-full mx-auto mb-2 rounded-full" />
        <Skeleton className="h-4 w-72 max-w-full mx-auto rounded-full" />
      </section>

      <section className="pt-5 px-12 pb-0 flex flex-col items-center gap-6">
        <Skeleton className="h-[46px] w-full max-w-[420px] rounded-[24px]" />

        <div className="flex gap-3.5 justify-center flex-wrap">
          {CATEGORIES.map((c, i) => (
            <Skeleton
              key={c.value}
              className={cn("h-9 rounded-[20px]", PILL_WIDTHS[i % PILL_WIDTHS.length])}
            />
          ))}
        </div>
      </section>

      <section className="pt-12 px-12 pb-[60px]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,320px))] justify-center gap-8">
          {Array.from({ length: CARD_COUNT }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3.5">
              <Skeleton className="aspect-square w-full rounded-[20px]" />
              <div className="flex justify-between items-baseline">
                <Skeleton className="h-4 w-24 rounded-full" />
                <Skeleton className="h-4 w-14 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
