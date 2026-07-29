"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Keyed on pathname so each route mount gets a fresh, quick slide+fade.
 * Entrance-only (no exit animation) — App Router unmounts the old route's
 * DOM as soon as navigation resolves, so a true crossfade would need
 * AnimatePresence holding both pages in memory, which fights the sticky
 * nav and each page's own on-mount FadeIn sections. This gets most of the
 * perceived-smoothness win with none of that complexity.
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
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
