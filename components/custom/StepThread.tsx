"use client";

import { motion, useReducedMotion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;
const THREAD_PATH = "M 33 22 C 55 4, 78 40, 100 22 S 145 4, 167 22";
const KNOTS = [33, 100, 167];

const wrapperStyle = {
  position: "absolute",
  left: 48,
  right: 48,
  top: 0,
  height: 44,
  pointerEvents: "none",
  zIndex: 0,
} as const;

/** Self-drawing thread connecting the 3 "how it works" step badges, echoing
 * the home hero's yarn-line motif. Purely decorative; hidden on narrow
 * viewports via the .step-thread class (globals.css) where the grid wraps
 * off a single row. */
export function StepThread() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <svg
        className="step-thread"
        style={wrapperStyle}
        width="100%"
        height={44}
        viewBox="0 0 200 44"
        preserveAspectRatio="none"
      >
        <path d={THREAD_PATH} fill="none" stroke="oklch(0.75 0.06 20)" strokeWidth={2} strokeLinecap="round" />
        {KNOTS.map((x) => (
          <circle key={x} cx={x} cy={22} r={3} fill="oklch(0.7 0.07 20)" />
        ))}
      </svg>
    );
  }

  return (
    <svg
      className="step-thread"
      style={wrapperStyle}
      width="100%"
      height={44}
      viewBox="0 0 200 44"
      preserveAspectRatio="none"
    >
      <motion.path
        d={THREAD_PATH}
        fill="none"
        stroke="oklch(0.75 0.06 20)"
        strokeWidth={2}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 1.1, ease }}
      />
      {KNOTS.map((x, i) => (
        <motion.circle
          key={x}
          cx={x}
          cy={22}
          r={3}
          fill="oklch(0.7 0.07 20)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ delay: 0.3 + i * 0.25, duration: 0.3 }}
        />
      ))}
    </svg>
  );
}
