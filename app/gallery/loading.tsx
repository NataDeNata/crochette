import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { getFullGallery } from "@/lib/data/gallery";

export default function GalleryLoading() {
  // Pure/sync — no I/O — reused only to keep the span pattern (2-col vs
  // 1-col tiles) perfectly in sync with the real grid without duplicating
  // the private span data in lib/data/gallery.ts.
  const spans = getFullGallery().map((item) => item.span);

  return (
    <>
      <section className="pt-[72px] px-12 pb-12 text-center">
        <Skeleton className="h-[13px] w-20 mx-auto mb-4 rounded-full" />
        <Skeleton className="h-[46px] w-[360px] max-w-full mx-auto mb-4" />
        <Skeleton className="h-4 w-[420px] max-w-full mx-auto mb-2 rounded-full" />
        <Skeleton className="h-4 w-[300px] max-w-full mx-auto rounded-full" />
      </section>

      <section className="pt-5 px-12 pb-[100px]">
        {/* auto-rows-[180px] mirrors app/gallery/page.tsx's rowHeight={180}
            prop to GallerySection, which sets the same value via inline
            --row-h. Update this literal if that prop value ever changes. */}
        <div className="gallery-grid grid auto-rows-[180px] gap-5">
          {spans.map((span, i) => (
            <Skeleton
              key={i}
              className={cn("h-full rounded-[18px]", span === 2 ? "row-span-2" : "row-span-1")}
            />
          ))}
        </div>
      </section>
    </>
  );
}
