"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Keyed on pathname so each route mount gets a fresh, quick fade.
 * Entrance-only (no exit animation) — App Router unmounts the old route's
 * DOM as soon as navigation resolves, so a true crossfade would need
 * AnimatePresence holding both pages in memory, which fights the sticky
 * nav and each page's own on-mount FadeIn sections. This gets most of the
 * perceived-smoothness win with none of that complexity.
 *
 * A CSS animation rather than a Framer one, and that is the load-bearing part.
 * This wraps the body of *every* page, so a Framer `initial={{ opacity: 0 }}`
 * here means the entire site is invisible until an animation completes — and
 * an animation that does not run (a backgrounded tab, a throttled one, a
 * dropped frame) is indistinguishable from a page that failed to load. The
 * `.page-reveal` keyframe has no fill-mode, so the resting state before and
 * after it is the ordinary, visible one. See globals.css.
 *
 * It also no longer needs a `useReducedMotion` branch: the keyframe lives
 * inside `prefers-reduced-motion: no-preference`, so the preference is
 * honoured by the stylesheet rather than by a second render path that could
 * drift from the first.
 *
 * THE HORIZONTAL SLIDE IS GONE, and it was not a taste call. This used to
 * enter from `x: 16`, which put every page 16px past the right edge for the
 * length of the transition. That was invisible only because
 * `body { overflow-x: hidden }` was clipping it — the same rule that made the
 * standard overflow check unusable on this project. Removing the rule with the
 * drag marquee exposed the slide as a real transient horizontal scrollbar on
 * every navigation.
 *
 * Opacity alone is also the right answer for this world regardless: the
 * press-out lift is the one authored moment, and a page-level slide competing
 * with it is the scattered-effects failure rather than an orchestrated one.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // `key` remounts on navigation, which is what replays the animation.
  return (
    <div key={pathname} className="page-reveal">
      {children}
    </div>
  );
}
