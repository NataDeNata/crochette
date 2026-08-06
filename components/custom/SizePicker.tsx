"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const SIZE_PRESETS = [
  { value: "S", label: "S", detail: "Mini amigurumi · approx. 4–6 in" },
  { value: "M", label: "M", detail: "Standard amigurumi · approx. 7–10 in" },
  { value: "L", label: "L", detail: "Large piece · approx. 11–14 in" },
  { value: "XL", label: "XL", detail: "Statement piece · approx. 15+ in" },
];

const inputClassName =
  "py-3 px-4 border-2 border-keyline bg-sheet text-sm [font-family:inherit] text-keyline placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red";

function pillLabel(preset: (typeof SIZE_PRESETS)[number]) {
  return `${preset.label}, ${preset.detail}`;
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
      {/* Same vocabulary as the colour picker and the sheet filters: keyline
          box at rest, butter when chosen. The sliding indicator is gone with
          the world that had one — this sheet marks a chosen thing by filling
          it, not by animating a token between positions. */}
      <div className="flex gap-2 flex-wrap">
        {SIZE_PRESETS.map((preset) => {
          const isActive = selected === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => selectPreset(preset)}
              className={cn(
                "type-sheet-spec h-11 w-12 cursor-pointer border-2 border-keyline transition-colors duration-200",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red",
                isActive
                  ? "bg-butter text-keyline"
                  : "bg-sheet text-keyline/70 hover:bg-secondary hover:text-keyline",
              )}
            >
              {preset.label}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={selected === "custom"}
          onClick={selectCustom}
          className={cn(
            "type-sheet-spec h-11 cursor-pointer border-2 border-keyline px-4 transition-colors duration-200",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red",
            selected === "custom"
              ? "bg-butter text-keyline"
              : "bg-sheet text-keyline/70 hover:bg-secondary hover:text-keyline",
          )}
        >
          Custom
        </button>
      </div>
      {activeDetail && <div className="text-[13px] text-muted-foreground">{activeDetail}</div>}
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
