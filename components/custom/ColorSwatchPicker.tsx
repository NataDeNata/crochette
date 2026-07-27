"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const SWATCHES = [
  { label: "Rose", swatchClass: "bg-[oklch(0.75_0.09_20)]" },
  { label: "Sage", swatchClass: "bg-[oklch(0.78_0.06_150)]" },
  { label: "Cream", swatchClass: "bg-[oklch(0.93_0.02_85)]" },
  { label: "Dusty blue", swatchClass: "bg-[oklch(0.72_0.05_240)]" },
  { label: "Terracotta", swatchClass: "bg-[oklch(0.62_0.1_40)]" },
];

const inputClassName =
  "py-3 px-4 rounded-lg border-[1.5px] border-[oklch(0.75_0.03_20)] bg-card text-sm [font-family:inherit]";

function joinValue(selected: Set<string>, custom: string) {
  return [...selected, custom.trim()].filter(Boolean).join(", ").slice(0, 200);
}

/** Multi-select preset color swatches for preferredColors, plus a free-text
 * fallback. Posts a single comma-joined string via a hidden input, so the
 * existing Zod schema (a plain optional string) needs no changes. */
export function ColorSwatchPicker({
  name,
  onValueChange,
}: {
  name: string;
  onValueChange?: (value: string) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const reduceMotion = useReducedMotion();

  function toggle(label: string) {
    const next = new Set(selected);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    setSelected(next);
    onValueChange?.(joinValue(next, customText));
  }

  function handleCustomChange(value: string) {
    setCustomText(value);
    onValueChange?.(joinValue(selected, value));
  }

  return (
    <div className="flex flex-col gap-2.5">
      <input type="hidden" name={name} value={joinValue(selected, customText)} />
      <div className="flex gap-3 items-center flex-wrap">
        {SWATCHES.map((s) => {
          const isActive = selected.has(s.label);
          return (
            <motion.button
              key={s.label}
              type="button"
              aria-pressed={isActive}
              aria-label={s.label}
              title={s.label}
              onClick={() => toggle(s.label)}
              animate={{ scale: isActive ? 1.12 : 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "w-[30px] h-[30px] rounded-full cursor-pointer p-0",
                s.swatchClass,
                isActive
                  ? "border-[2.5px] border-[oklch(0.28_0.02_60)] shadow-[0_0_0_2px_oklch(0.98_0.01_85)]"
                  : "border-[1.5px] border-card shadow-none",
              )}
            />
          );
        })}
        <button
          type="button"
          aria-pressed={customOpen}
          onClick={() => setCustomOpen((v) => !v)}
          className={cn(
            "py-1.5 px-3.5 rounded-[20px] border-[1.5px] text-[12.5px] font-medium cursor-pointer [font-family:inherit]",
            customOpen ? "border-primary bg-primary text-card" : "border-[oklch(0.75_0.03_20)] bg-card text-[oklch(0.42_0.02_60)]",
          )}
        >
          Custom…
        </button>
      </div>
      {customOpen && (
        <input
          placeholder="Add specific colors…"
          value={customText}
          onChange={(e) => handleCustomChange(e.target.value)}
          className={inputClassName}
        />
      )}
    </div>
  );
}
