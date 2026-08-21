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
 * Being homepage-only also means it can match what it stands in for: a
 * full-bleed hero with a left-aligned copy block, rather than the generic
 * centered eyebrow/heading/subtext it had to use when it was shared with
 * /about, /contact, /cart and friends. Those pages are synchronous, so they
 * never render a fallback long enough to matter.
 *
 * REPAINTED 2026-08-17, and it was wrong for eleven days before that. This
 * stood in for "a dark, full-bleed hero" with `bg-white/15` skeletons on a
 * near-black `oklch(0.28 0.02 60)` panel — the pre-cream hero. CutoutHero has
 * been `bg-sheet` since PR #11, so the homepage was opening on a flash of dark
 * viridian and then painting cream: the wrong-theme flash this file's own
 * comment was written to avoid, caused by the fix for it. It is the exact
 * failure recorded against the hardcoded oklch literals — a value that cannot
 * follow a repaint, in a file nobody reopened because it renders for under a
 * second. It reads its colours from the tokens now, so the next repaint carries
 * it.
 *
 * The eyebrow bar went at the same time. It reserved space above the headline
 * for the "Press-out sheet No. 01" colophon row, which was removed sitewide in
 * PR #11 — CutoutHero now opens directly on its h1 (see the comment where that
 * row used to be). A fallback holding a slot for something that no longer
 * renders pushes the headline down and then lets it jump up on hydration, which
 * is the one thing a skeleton exists to prevent.
 *
 * The rule this file keeps proving: a loading state is only ever correct
 * relative to the thing it stands in for, so it goes stale silently every time
 * that thing changes. Anything editing CutoutHero's first viewport should open
 * this file too.
 */
export default function HomeLoading() {
  return (
    <section className="relative overflow-hidden min-h-[calc(100svh-var(--nav-h))] flex items-center page-gutter py-16 sm:py-24 bg-sheet">
      <div className="max-w-[1280px] mx-auto relative w-full">
        {/* No `bg-*` or `rounded-*` override on any bar below, deliberately.
            Skeleton's default is `bg-secondary rounded-lg`, and in this world
            --radius is 0.125rem — the die-cut trimmed corner. The pill radii
            these bars used to carry (`rounded-full`, `rounded-[30px]` on the
            CTAs) described the old rounded hero; the real tabs in CutoutHero
            are square-cornered 2px-ruled tabs. Overriding either property here
            is how the fallback drifted out of the theme in the first place. */}
        <div className="max-w-[480px] md:-translate-y-[100px]">
          <Skeleton className="h-[clamp(38px,5.7vw,72px)] w-full mb-3" />
          <Skeleton className="h-[clamp(38px,5.7vw,72px)] w-3/4 mb-[22px]" />

          <div className="flex flex-col gap-2.5 max-w-[420px] mb-9">
            <Skeleton className="h-[19px] w-full" />
            <Skeleton className="h-[19px] w-5/6" />
          </div>

          {/* Mirrors the real hero's stacked-then-inline CTAs — a fixed
              200px+210px row here would overflow the phone the page it stands
              in for no longer overflows. */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Skeleton className="h-12 w-full sm:w-[200px]" />
            <Skeleton className="h-12 w-full sm:w-[210px]" />
          </div>
        </div>
      </div>
    </section>
  );
}
