import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Homepage-only fallback.
 *
 * This file used to sit at app/loading.tsx, where Next.js resolves it as the
 * nearest ancestor for EVERY route without a closer one — including
 * /shop/[slug] and /order/[id]. A loading.tsx creates a Suspense boundary, and
 * a streamed response commits its status line before the page decides it is
 * missing, so those two returned 200 on a not-found instead of 404. Moving it
 * into the (home) route group scopes it to app/(home)/page.tsx and nothing
 * else. Route groups don't affect the URL, so the homepage is still "/".
 *
 * Being homepage-only also means it can finally match what it stands in for:
 * a dark, full-bleed hero with a left-aligned copy block, rather than the
 * generic centered eyebrow/heading/subtext it had to use when it was shared
 * with /about, /contact, /cart and friends. Those pages are synchronous, so
 * they never render a fallback long enough to matter.
 *
 * Skeletons are tinted bg-white/15 rather than the default bg-secondary
 * because they sit on the dark hero, where the light default would read as a
 * flash of the wrong theme.
 */
export default function HomeLoading() {
  return (
    <section className="relative overflow-hidden min-h-[calc(100vh-89px)] flex items-center px-12 py-24 bg-[oklch(0.28_0.02_60)]">
      <div className="max-w-[1280px] mx-auto relative w-full">
        <div className="max-w-[480px] -translate-y-[100px]">
          <Skeleton className="h-3.5 w-52 mb-[18px] rounded-full bg-white/15" />

          <Skeleton className="h-[clamp(50px,5.7vw,72px)] w-full mb-3 bg-white/15" />
          <Skeleton className="h-[clamp(50px,5.7vw,72px)] w-3/4 mb-[22px] bg-white/15" />

          <div className="flex flex-col gap-2.5 max-w-[420px] mb-9">
            <Skeleton className="h-[19px] w-full rounded-full bg-white/15" />
            <Skeleton className="h-[19px] w-5/6 rounded-full bg-white/15" />
          </div>

          <div className="flex gap-4">
            <Skeleton className="h-12 w-[200px] rounded-[30px] bg-white/15" />
            <Skeleton className="h-12 w-[210px] rounded-[30px] bg-white/15" />
          </div>
        </div>
      </div>
    </section>
  );
}
