"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const SIZE_PRESETS = [
  { value: "S", label: "S", detail: "Mini amigurumi · approx. 4–6 in" },
  { value: "M", label: "M", detail: "Standard amigurumi · approx. 7–10 in" },
  { value: "L", label: "L", detail: "Large piece · approx. 11–14 in" },
  { value: "XL", label: "XL", detail: "Statement piece · approx. 15+ in" },
];

const inputClassName =
  "py-3 px-4 rounded-lg border-[1.5px] border-[oklch(0.75_0.03_20)] bg-card text-sm [font-family:inherit]";

function pillLabel(preset: (typeof SIZE_PRESETS)[number]) {
  return `${preset.label} — ${preset.detail}`;
}

/** Single-select size picker: S/M/L/XL presets carry a default stitch size
 * description, so most customers never have to type anything. A trailing
 * "Custom" pill reveals a free-text field for anything that doesn't fit.
 * Posts a single plain string via a hidden input — the existing Zod
 * `preferredSize` field (optional string, ≤120 chars) needs no changes. */
export function SizePicker({
  name,
  onValueChange,
}: {
  name: string;
  onValueChange?: (value: string) => void;
}) {
  const [selected, setSelected] = useState<string>("");
  const [customText, setCustomText] = useState("");
  const reduceMotion = useReducedMotion();

  function selectPreset(preset: (typeof SIZE_PRESETS)[number]) {
    setSelected(preset.value);
    onValueChange?.(pillLabel(preset));
  }

  function selectCustom() {
    setSelected("custom");
    onValueChange?.(customText);
  }

  function handleCustomText(value: string) {
    setCustomText(value);
    onValueChange?.(value);
  }

  const postedValue =
    selected === "custom" ? customText : selected ? pillLabel(SIZE_PRESETS.find((p) => p.value === selected)!) : "";

  const activeDetail =
    selected === "custom" ? "Describe your own size" : SIZE_PRESETS.find((p) => p.value === selected)?.detail;

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={postedValue} />
      <div className="flex gap-2.5 flex-wrap">
        {SIZE_PRESETS.map((preset) => {
          const isActive = selected === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => selectPreset(preset)}
              className={cn(
                "relative w-11 py-[9px] rounded-[20px] border-[1.5px] text-[13px] font-medium cursor-pointer bg-card [font-family:inherit]",
                isActive && reduceMotion
                  ? "border-[oklch(0.28_0.02_60)]"
                  : isActive
                    ? "border-transparent"
                    : "border-[oklch(0.75_0.03_20)]",
              )}
            >
              {isActive && !reduceMotion && (
                <motion.span
                  layoutId="custom-size-active"
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
                {preset.label}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={selected === "custom"}
          onClick={selectCustom}
          className={cn(
            "py-[9px] px-4 rounded-[20px] border-[1.5px] text-[13px] font-medium cursor-pointer [font-family:inherit]",
            selected === "custom" ? "border-primary bg-primary text-card" : "border-[oklch(0.75_0.03_20)] bg-card text-[oklch(0.42_0.02_60)]",
          )}
        >
          Custom…
        </button>
      </div>
      {activeDetail && <div className="text-[12.5px] text-[oklch(0.45_0.02_60)]">{activeDetail}</div>}
      {selected === "custom" && (
        <input
          placeholder="Describe your size…"
          value={customText}
          onChange={(e) => handleCustomText(e.target.value)}
          className={inputClassName}
        />
      )}
    </div>
  );
}
