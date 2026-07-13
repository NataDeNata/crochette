"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const errorStyle = {
  fontSize: 12.5,
  color: "oklch(0.5 0.18 25)",
} as const;

export function FieldError({ error }: { error?: string }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return error ? <span style={errorStyle}>{error}</span> : null;
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
          style={errorStyle}
        >
          {error}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
