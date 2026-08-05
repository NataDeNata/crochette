/** Single source of truth for the 6-color placeholder-background cycle used
 * by product cards and gallery tiles. Previously duplicated as raw oklch
 * strings in three files; expressed here as literal Tailwind class names
 * (not runtime-built arbitrary values) so Tailwind's content scanner picks
 * them up at build time.
 *
 * As of the Akari overhaul these are quiet paper and bamboo tones rather than
 * six pale pastels: a product without photography renders as a blank sheet,
 * which is honestly what it is until the piece is shot. Every consumer is a
 * storefront surface, which matters because these tokens are declared on
 * [data-surface="storefront"] and resolve to nothing outside it. Do not reach
 * for these from /admin. */
export const BG_CYCLE_CLASSES = [
  "bg-paper",
  "bg-ash",
  "bg-bamboo/45",
  "bg-paper",
  "bg-bamboo/30",
  "bg-ash",
] as const;
