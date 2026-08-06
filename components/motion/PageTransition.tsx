"use client";

import { motion, useReducedMotion } from "framer-motion";
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
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
