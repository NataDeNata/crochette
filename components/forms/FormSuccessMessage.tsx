"use client";

import { motion, useReducedMotion } from "framer-motion";

export function FormSuccessMessage({ message }: { message?: string }) {
  const reduceMotion = useReducedMotion();

  const style = {
    padding: 24,
    borderRadius: 16,
    background: "oklch(0.95 0.03 150)",
    color: "oklch(0.3 0.05 150)",
    fontSize: 15,
    lineHeight: 1.6,
  } as const;

  if (reduceMotion) {
    return <div style={style}>{message}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={style}
    >
      {message}
    </motion.div>
  );
}
