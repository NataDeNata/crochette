"use client";

import { motion, useReducedMotion, type TargetAndTransition } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

type FadeInProps = {
  children: ReactNode;
  className?: string;
  /** Applied to the wrapping element — needed when it's a direct grid/flex
   * item (e.g. `gridRow: "span 2"`) so placement lands on the real item
   * instead of being inert on a nested child. */
  style?: CSSProperties;
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
 */
export function FadeIn({
  children,
  className,
  style,
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
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }

  return (
    <MotionTag
      className={className}
      style={style}
      layout={layout}
      exit={exit}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionTag>
  );
}
