"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";

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

  return (
    <Button type="submit" disabled={isPending} className="self-start">
      <AnimatePresence initial={false}>
        {isPending && !reduceMotion && (
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
            className="w-3.5 h-3.5 rounded-full border-2 border-[oklch(0.98_0.01_85/0.4)] border-t-[oklch(0.98_0.01_85)] inline-block"
          />
        )}
      </AnimatePresence>
      {isPending ? pendingLabel : label}
    </Button>
  );
}
