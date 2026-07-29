import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

// getFullGallery() is now async/DB-driven (admin-curated gallery), so this
// skeleton can no longer derive its span pattern from the real data — it
// only needs to look similar, not match exactly, since the curated set's
// length is admin-controlled and variable anyway.
const SKELETON_SPANS = [2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 1, 2];

export default function GalleryLoading() {
  const spans = SKELETON_SPANS;

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
