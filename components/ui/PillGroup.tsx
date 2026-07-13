"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type PillOption = { value: string; label: string };

/** Single-select pill picker. Posts its value as a plain string via a hidden
 * input, so it drops into any FormData-based form unchanged. Sliding active
 * background mirrors the ShopGrid category-filter pills. */
export function PillGroup({
  name,
  options,
  defaultValue = "",
  onValueChange,
  layoutId,
  ariaLabel,
}: {
  name: string;
  options: PillOption[];
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  layoutId: string;
  ariaLabel: string;
}) {
  const [selected, setSelected] = useState(defaultValue);
  const reduceMotion = useReducedMotion();

  function select(value: string) {
    setSelected(value);
    onValueChange?.(value);
  }

  return (
    <div aria-label={ariaLabel} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <input type="hidden" name={name} value={selected} />
      {options.map((opt) => {
        const isActive = opt.value === selected;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => select(opt.value)}
            style={{
              position: "relative",
              padding: "9px 16px",
              borderRadius: 20,
              border: `1.5px solid ${isActive && reduceMotion ? "oklch(0.28 0.02 60)" : isActive ? "transparent" : "oklch(0.75 0.03 20)"}`,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              background: "oklch(0.98 0.01 85)",
              fontFamily: "inherit",
            }}
          >
            {isActive && !reduceMotion && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 20,
                  background: "oklch(0.28 0.02 60)",
                  zIndex: 0,
                }}
              />
            )}
            <span
              style={{
                position: "relative",
                zIndex: 1,
                color: isActive
                  ? reduceMotion
                    ? "oklch(0.28 0.02 60)"
                    : "oklch(0.98 0.01 85)"
                  : "oklch(0.42 0.02 60)",
              }}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
