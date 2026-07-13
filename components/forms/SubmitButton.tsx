"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export function SubmitButton({
  isPending,
  label,
  pendingLabel,
}: {
  isPending: boolean;
  label: string;
  pendingLabel: string;
}) {
  const reduceMotion = useReducedMotion();

  const style = {
    alignSelf: "flex-start",
    background: "oklch(0.28 0.02 60)",
    color: "oklch(0.98 0.01 85)",
    border: "none",
    padding: "14px 30px",
    borderRadius: 30,
    fontSize: 14,
    fontWeight: 500,
    cursor: isPending ? "default" : "pointer",
    opacity: isPending ? 0.7 : 1,
    display: "flex",
    alignItems: "center",
    gap: 10,
  } as const;

  if (reduceMotion) {
    return (
      <button type="submit" disabled={isPending} style={style}>
        {isPending ? pendingLabel : label}
      </button>
    );
  }

  return (
    <motion.button
      type="submit"
      disabled={isPending}
      whileHover={!isPending ? { scale: 1.03 } : undefined}
      whileTap={!isPending ? { scale: 0.97 } : undefined}
      style={style}
    >
      <AnimatePresence initial={false}>
        {isPending && (
          <motion.span
            key="spinner"
            initial={{ opacity: 0, scale: 0.6, rotate: 0 }}
            animate={{ opacity: 1, scale: 1, rotate: 360 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 },
              rotate: { repeat: Infinity, duration: 0.7, ease: "linear" },
            }}
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: "2px solid oklch(0.98 0.01 85 / 0.4)",
              borderTopColor: "oklch(0.98 0.01 85)",
              display: "inline-block",
            }}
          />
        )}
      </AnimatePresence>
      {isPending ? pendingLabel : label}
    </motion.button>
  );
}
