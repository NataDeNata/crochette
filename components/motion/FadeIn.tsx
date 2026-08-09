"use client";

import { motion, useReducedMotion, type TargetAndTransition } from "framer-motion";
import type { ReactNode } from "react";

type FadeInProps = {
  children: ReactNode;
  /** Applied to the wrapping element — needed when it's a direct grid/flex
   * item (e.g. `row-span-2`) so placement lands on the real item instead of
   * being inert on a nested child. */
  className?: string;
  /** Seconds to delay the entrance — useful for staggering grids. */
  delay?: number;
  /** Vertical rise distance in px. */
  y?: number;
  as?: "div" | "section" | "li" | "article" | "header";
  /** Enables FLIP reflow animation when siblings are added/removed. */
  layout?: boolean;
  /** Exit animation — requires an ancestor `AnimatePresence`. */
  exit?: TargetAndTransition;
};

/**
 * Scroll-triggered fade + rise. Reproduces the design's `fadeUp` keyframe.
 * Animates opacity/transform only, runs once, and fully disables under
 * prefers-reduced-motion (content stays visible).
 *
 * ONLY FOR CONTENT THAT IS PRESENT FROM FIRST PAINT. This mounts its child at
 * `opacity: 0` and waits for an IntersectionObserver callback, which makes the
 * child's *visibility* depend on an animation running. That is fine for a page
 * section the visitor scrolls down to and wrong for anything that appears in
 * response to an action — a card mounted below the fold by a filter change is
 * already past the observer's margin, so it stays invisible until the visitor
 * scrolls, and a visitor who filters and sees nothing concludes there is
 * nothing. The shop grid used to be wrapped in this and is not any more; it
 * uses the `.sheet-reveal` CSS entrance instead, whose resting state is
 * visible.
 */
export function FadeIn({
  children,
  className,
  delay = 0,
  y = 24,
  as = "div",
  layout,
  exit,
}: FadeInProps) {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion[as];

  if (reduceMotion) {
    const Tag = as;
    return (
      <Tag className={className}>{children}</Tag>
    );
  }

  return (
    <MotionTag
      className={className}
      layout={layout}
      exit={exit}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      // -40px, not the -80px this started at. The margin shrinks the viewport
      // the observer tests against, so it is a delay measured in pixels of
      // scrolling — and stacked on top of the duration and the caller's
      // stagger it was enough for a section to read as still loading rather
      // than as arriving.
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionTag>
  );
}
