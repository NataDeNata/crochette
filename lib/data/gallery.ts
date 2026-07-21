export interface GalleryItem {
  placeholder: string;
  bg: string;
  span: number;
  /** Real photo URL. When present, tiles render this instead of the placeholder block. */
  image?: string;
  alt?: string;
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

/** Stock stand-ins until real studio photography is shot — see doc §3.2/§6.1. */
const HOME_IMAGES = [
  "https://images.unsplash.com/photo-1757303834948-258e46d9bd99?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=80&w=800",
  "https://images.unsplash.com/photo-1649680954447-cb65a40755a8?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=80&w=800",
  "https://images.unsplash.com/photo-1757303835406-b4e2bde0fd2f?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=80&w=800",
  "https://images.unsplash.com/photo-1643883540345-64ebe9258337?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=80&w=800",
  "https://images.unsplash.com/photo-1732391928574-117e1d266084?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=80&w=800",
  "https://images.unsplash.com/photo-1638460002739-0277e2177cb7?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=80&w=800",
  "https://images.unsplash.com/photo-1757303834858-3390ab6c3f11?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=80&w=800",
  "https://images.unsplash.com/photo-1776890370644-4cc359b0733d?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=80&w=800",
];

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

function build(labels: string[], spans: number[], images?: string[]): GalleryItem[] {
  return labels.map((label, i) => ({
    placeholder: `gallery — ${label}`,
    bg: BG_CYCLE[i % BG_CYCLE.length],
    span: spans[i % spans.length],
    image: images?.[i],
    alt: images ? label : undefined,
  }));
}

/** 8-item teaser grid — Home page. */
export function getHomeGallery(): GalleryItem[] {
  return build(HOME_LABELS, HOME_SPANS, HOME_IMAGES);
}

/** Full 16-item grid — Gallery page. */
export function getFullGallery(): GalleryItem[] {
  return build(FULL_LABELS, FULL_SPANS);
}
