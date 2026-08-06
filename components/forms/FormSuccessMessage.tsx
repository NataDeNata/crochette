"use client";

import { motion, useReducedMotion } from "framer-motion";

export function FormSuccessMessage({ message }: { message?: string }) {
  const reduceMotion = useReducedMotion();

  /* A stamped receipt rather than a soft green panel: keyline box, butter
     ground, key-colour text. Two cream-palette oklch literals came out. */
  const className =
    "p-6 border-2 border-keyline bg-butter text-keyline text-[15px] leading-[1.6]";

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
