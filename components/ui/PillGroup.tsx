"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

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
    <div aria-label={ariaLabel} className="flex gap-2.5 flex-wrap">
      <input type="hidden" name={name} value={selected} />
      {options.map((opt) => {
        const isActive = opt.value === selected;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => select(opt.value)}
            className={cn(
              "relative py-[9px] px-4 rounded-[20px] border-[1.5px] text-[13px] font-medium cursor-pointer bg-card [font-family:inherit]",
              isActive && reduceMotion
                ? "border-[oklch(0.28_0.02_60)]"
                : isActive
                  ? "border-transparent"
                  : "border-input",
            )}
          >
            {isActive && !reduceMotion && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                className="absolute inset-0 rounded-[20px] bg-primary z-0"
              />
            )}
            <span
              className={cn(
                "relative z-[1]",
                isActive ? (reduceMotion ? "text-primary" : "text-card") : "text-[oklch(0.42_0.02_60)]",
              )}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
