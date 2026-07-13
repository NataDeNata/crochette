"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const SWATCHES = [
  { label: "Rose", color: "oklch(0.75 0.09 20)" },
  { label: "Sage", color: "oklch(0.78 0.06 150)" },
  { label: "Cream", color: "oklch(0.93 0.02 85)" },
  { label: "Dusty blue", color: "oklch(0.72 0.05 240)" },
  { label: "Terracotta", color: "oklch(0.62 0.1 40)" },
];

const inputStyle = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "1.5px solid oklch(0.75 0.03 20)",
  background: "oklch(0.98 0.01 85)",
  fontSize: 14,
  fontFamily: "inherit",
} as const;

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
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name={name} value={joinValue(selected, customText)} />
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
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
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: s.color,
                border: isActive ? "2.5px solid oklch(0.28 0.02 60)" : "1.5px solid oklch(0.98 0.01 85)",
                boxShadow: isActive ? "0 0 0 2px oklch(0.98 0.01 85)" : "none",
                cursor: "pointer",
                padding: 0,
              }}
            />
          );
        })}
        <button
          type="button"
          aria-pressed={customOpen}
          onClick={() => setCustomOpen((v) => !v)}
          style={{
            padding: "6px 14px",
            borderRadius: 20,
            border: `1.5px solid ${customOpen ? "oklch(0.28 0.02 60)" : "oklch(0.75 0.03 20)"}`,
            fontSize: 12.5,
            fontWeight: 500,
            cursor: "pointer",
            background: customOpen ? "oklch(0.28 0.02 60)" : "oklch(0.98 0.01 85)",
            color: customOpen ? "oklch(0.98 0.01 85)" : "oklch(0.42 0.02 60)",
            fontFamily: "inherit",
          }}
        >
          Custom…
        </button>
      </div>
      {customOpen && (
        <input
          placeholder="Add specific colors…"
          value={customText}
          onChange={(e) => handleCustomChange(e.target.value)}
          style={inputStyle}
        />
      )}
    </div>
  );
}
