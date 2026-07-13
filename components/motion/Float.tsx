"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

type FloatProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Full cycle duration in seconds (design uses 9s / 11s). */
  duration?: number;
  /** Peak vertical travel in px. */
  distance?: number;
  /** Optional 3-keyframe rotation loop in degrees, e.g. [-2, 1, -2]. */
  rotate?: [number, number, number];
  /** Stagger the loop start so multiple accents drift out of sync. */
  delay?: number;
};

/**
 * Gentle infinite drift. Reproduces the design's `floatSlow` / `floatSlow2`
 * ambient motion on decorative accents. Transform-only and disabled under
 * prefers-reduced-motion.
 */
export function Float({
  children,
  className,
  style,
  duration = 9,
  distance = 12,
  rotate,
  delay = 0,
}: FloatProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      animate={{
        y: [0, -distance, 0],
        ...(rotate ? { rotate } : {}),
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}
