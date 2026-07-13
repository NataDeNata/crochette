export interface GalleryItem {
  placeholder: string;
  bg: string;
  span: number;
}

const BG_CYCLE = [
  "oklch(0.9 0.045 20)",
  "oklch(0.9 0.05 150)",
  "oklch(0.92 0.03 260)",
  "oklch(0.9 0.05 60)",
  "oklch(0.93 0.03 20)",
  "oklch(0.91 0.04 150)",
];

const HOME_LABELS = [
  "studio workspace",
  "yarn shelf",
  "work in progress",
  "finished piece",
  "packaging",
  "color palette",
  "detail shot",
  "happy customer",
];
const HOME_SPANS = [2, 1, 1, 2, 1, 2, 1, 1];

const FULL_LABELS = [
  "studio workspace",
  "yarn shelf",
  "work in progress",
  "finished piece",
  "packaging",
  "color palette",
  "detail shot",
  "happy customer",
  "hands crocheting",
  "sunlit corner",
  "skein collection",
  "gift wrapping",
  "plush texture",
  "market stall",
  "seasonal set",
  "thread spools",
];
const FULL_SPANS = [2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1];

function build(labels: string[], spans: number[]): GalleryItem[] {
  return labels.map((label, i) => ({
    placeholder: `gallery — ${label}`,
    bg: BG_CYCLE[i % BG_CYCLE.length],
    span: spans[i % spans.length],
  }));
}

/** 8-item teaser grid — Home page. */
export function getHomeGallery(): GalleryItem[] {
  return build(HOME_LABELS, HOME_SPANS);
}

/** Full 16-item grid — Gallery page. */
export function getFullGallery(): GalleryItem[] {
  return build(FULL_LABELS, FULL_SPANS);
}
