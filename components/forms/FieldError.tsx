"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const errorClassName = "text-[12.5px] text-[oklch(0.5_0.18_25)]";

export function FieldError({ error }: { error?: string }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return error ? <span className={errorClassName}>{error}</span> : null;
  }

  return (
    <AnimatePresence mode="wait">
      {error && (
        <motion.span
          key={error}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className={errorClassName}
        >
          {error}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
