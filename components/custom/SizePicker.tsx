"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const SIZE_PRESETS = [
  { value: "S", label: "S", detail: "Mini amigurumi · approx. 4–6 in" },
  { value: "M", label: "M", detail: "Standard amigurumi · approx. 7–10 in" },
  { value: "L", label: "L", detail: "Large piece · approx. 11–14 in" },
  { value: "XL", label: "XL", detail: "Statement piece · approx. 15+ in" },
];

const inputStyle = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "1.5px solid oklch(0.75 0.03 20)",
  background: "oklch(0.98 0.01 85)",
  fontSize: 14,
  fontFamily: "inherit",
} as const;

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
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="hidden" name={name} value={postedValue} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {SIZE_PRESETS.map((preset) => {
          const isActive = selected === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => selectPreset(preset)}
              style={{
                position: "relative",
                width: 44,
                padding: "9px 0",
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
                  layoutId="custom-size-active"
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
                {preset.label}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={selected === "custom"}
          onClick={selectCustom}
          style={{
            padding: "9px 16px",
            borderRadius: 20,
            border: `1.5px solid ${selected === "custom" ? "oklch(0.28 0.02 60)" : "oklch(0.75 0.03 20)"}`,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            background: selected === "custom" ? "oklch(0.28 0.02 60)" : "oklch(0.98 0.01 85)",
            color: selected === "custom" ? "oklch(0.98 0.01 85)" : "oklch(0.42 0.02 60)",
            fontFamily: "inherit",
          }}
        >
          Custom…
        </button>
      </div>
      {activeDetail && <div style={{ fontSize: 12.5, color: "oklch(0.45 0.02 60)" }}>{activeDetail}</div>}
      {selected === "custom" && (
        <input
          placeholder="Describe your size…"
          value={customText}
          onChange={(e) => handleCustomText(e.target.value)}
          style={inputStyle}
        />
      )}
    </div>
  );
}
