"use client";

import { motion, useReducedMotion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;
const THREAD_PATH = "M 33 22 C 55 4, 78 40, 100 22 S 145 4, 167 22";
const KNOTS = [33, 100, 167];

const wrapperClassName = "step-thread absolute left-12 right-12 top-0 h-11 pointer-events-none z-[-1]";

/* The two oklch literals below stay literals, and this is a judgement, not an
 * omission. --rose is the nearest token (#dda99e, about oklch(0.78 0.064 32))
 * and it is close enough to the thread stroke, oklch(0.75 0.06 20) — but the
 * knots are a second, deliberately darker and more saturated value,
 * oklch(0.7 0.07 20), which is what makes them read as knots tied *in* the
 * thread rather than as beads of the same paint. No single token carries both,
 * so pointing both at --rose would flatten the knots into the line and lose the
 * only thing this drawing says. Tokenising just the stroke would be worse: the
 * two values would then drift apart on the next repaint, and the knots would go
 * from darker-than-the-thread to lighter with nobody touching this file.
 * If the palette ever gains a paired rose (a --rose plus a deeper --rose-ink),
 * switch both together. */
/** Self-drawing thread connecting the 3 "how it works" step badges, echoing
 * the home hero's yarn-line motif. Purely decorative; hidden on narrow
 * viewports via the .step-thread class (globals.css) where the grid wraps
 * off a single row. */
export function StepThread() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <svg
        className={wrapperClassName}
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
      className={wrapperClassName}
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
