"use client";

import { motion, useReducedMotion } from "framer-motion";

export function FormSuccessMessage({ message }: { message?: string }) {
  const reduceMotion = useReducedMotion();

  const className = "p-6 rounded-[16px] bg-[oklch(0.95_0.03_150)] text-[oklch(0.3_0.05_150)] text-[15px] leading-[1.6]";

  if (reduceMotion) {
    return <div className={className}>{message}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {message}
    </motion.div>
  );
}
