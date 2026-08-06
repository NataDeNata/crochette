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

/* The swatch labels and their colours are left exactly as they were. They name
 * the yarn the studio actually stocks, which makes them product truth rather
 * than palette — renaming Rose to Madder to match the site's dyes would change
 * what the owner reads on an order for the sake of a visual rhyme. */
const inputClassName =
  "py-3 px-4 border-2 border-keyline bg-sheet text-sm [font-family:inherit] text-keyline placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red";

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
      {/* A chosen swatch lifts and takes an ink rule, rather than scaling —
          a swatch that grows stops lining up with the row it sits in. */}
      <div className="flex gap-2 items-stretch flex-wrap">
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
              animate={{ y: isActive ? -3 : 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "size-11 cursor-pointer p-0 border-2 border-keyline relative overflow-hidden",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red",
                s.swatchClass,
              )}
            >
              {isActive && (
                // The chosen ink gets a press-red ring inside its keyline —
                // the same colour the sheet uses for "this is the live one".
                <span
                  aria-hidden
                  className="absolute inset-0 border-[3px] border-press-red"
                />
              )}
            </motion.button>
          );
        })}
        <button
          type="button"
          aria-pressed={customOpen}
          onClick={() => setCustomOpen((v) => !v)}
          className={cn(
            "type-sheet-spec cursor-pointer border-2 border-keyline px-4 transition-colors duration-200",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red",
            customOpen ? "bg-butter text-keyline" : "bg-sheet text-keyline/70",
          )}
        >
          Custom
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
