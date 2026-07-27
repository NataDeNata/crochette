/** Single source of truth for the 6-color placeholder-background cycle used
 * by product cards and gallery tiles. Previously duplicated as raw oklch
 * strings in three files; expressed here as literal Tailwind class names
 * (not runtime-built arbitrary values) so Tailwind's content scanner picks
 * them up at build time. */
export const BG_CYCLE_CLASSES = [
  "bg-[oklch(0.9_0.045_20)]",
  "bg-[oklch(0.9_0.05_150)]",
  "bg-[oklch(0.92_0.03_260)]",
  "bg-[oklch(0.9_0.05_60)]",
  "bg-[oklch(0.93_0.03_20)]",
  "bg-[oklch(0.91_0.04_150)]",
] as const;
