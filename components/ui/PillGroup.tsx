"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type PillOption = { value: string; label: string };

/** Single-select picker. Posts its value as a plain string via a hidden input,
 * so it drops into any FormData-based form unchanged.
 *
 * Nothing here is a pill any more — the name is kept because every call site
 * and its `layoutId` argument use it, and renaming a working component across
 * the form surfaces is churn this rebuild does not need. It is a row of
 * keyline plates that fill with butter when chosen, matching the size and
 * colour pickers beside it and the sheet filters on /shop.
 *
 * The sliding indicator is gone. It animated a token between positions, which
 * is a second authored moment competing with the press-out, and it forced the
 * three sibling pickers to each carry a `reduceMotion` branch for a decoration.
 * `layoutId` is now unused but kept in the signature for the same reason the
 * name is — see above.
 */
export function PillGroup({
  name,
  options,
  defaultValue = "",
  onValueChange,
  ariaLabel,
}: {
  name: string;
  options: PillOption[];
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Unused since the sliding indicator was removed; retained so existing call
   * sites keep type-checking. */
  layoutId?: string;
  ariaLabel: string;
}) {
  const [selected, setSelected] = useState(defaultValue);

  function select(value: string) {
    setSelected(value);
    onValueChange?.(value);
  }

  return (
    <div aria-label={ariaLabel} className="flex flex-wrap gap-2">
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
              "type-sheet-spec cursor-pointer border-2 border-keyline px-3.5 py-2.5 [font-family:inherit] transition-colors duration-200",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red",
              isActive
                ? "bg-butter text-keyline"
                : "bg-sheet text-keyline/70 hover:bg-secondary hover:text-keyline",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
