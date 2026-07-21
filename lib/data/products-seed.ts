import type { Product, ProductCategory } from "./products";

const BG_CYCLE = [
  "oklch(0.9 0.045 20)",
  "oklch(0.9 0.05 150)",
  "oklch(0.92 0.03 260)",
  "oklch(0.9 0.05 60)",
  "oklch(0.93 0.03 20)",
  "oklch(0.91 0.04 150)",
];

const CATALOG: Array<{
  name: string;
  description: string;
  priceCents: number;
  category: ProductCategory;
  tag?: string;
}> = [
  {
    name: "Milo the Bear",
    description: "A soft, huggable bear amigurumi with a hand-embroidered face and a little tartan bow.",
    priceCents: 85000,
    category: "amigurumi",
    tag: "Bestseller",
  },
  {
    name: "Sunny Daisy Bouquet",
    description: "A cheerful bouquet of crocheted daisies on wire stems — never wilts, always sunny.",
    priceCents: 45000,
    category: "flowers",
  },
  {
    name: "Cloud Basket",
    description: "A sturdy cotton-rope basket in cloud white, perfect for yarn, plants, or odds and ends.",
    priceCents: 95000,
    category: "baskets",
  },
  {
    name: "Little Fox Friend",
    description: "A curious little fox with a fluffy tail and a mischievous stitched-on grin.",
    priceCents: 75000,
    category: "amigurumi",
    tag: "New",
  },
  {
    name: "Rosebud Coaster Set",
    description: "Four rosebud coasters in dusty rose and sage, worked flat and stiffened to hold their shape.",
    priceCents: 38000,
    category: "home-decor",
  },
  {
    name: "Petal Garland",
    description: "A long garland of tiny crocheted petals, strung together for a shelf, wall, or window.",
    priceCents: 55000,
    category: "flowers",
    tag: "New",
  },
  {
    name: "Bumble the Bee",
    description: "A round, striped little bee with gauzy net wings and a gentle smile.",
    priceCents: 65000,
    category: "amigurumi",
  },
  {
    name: "Meadow Wall Hanging",
    description: "A woven wall hanging with crocheted florals scattered across a driftwood dowel.",
    priceCents: 120000,
    category: "home-decor",
  },
  {
    name: "Tiny Turtle Duo",
    description: "Two miniature turtles with mismatched shell patterns, sold as a pair.",
    priceCents: 48000,
    category: "amigurumi",
  },
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Original mock catalog — used only to seed the `products` table (`lib/db/seed.ts`).
 * Storefront reads go through `getProducts` in `./products.server.ts`, which queries
 * the live database instead. */
export function getSeedProducts(): Product[] {
  return CATALOG.map((item, i) => ({
    id: `p_${slugify(item.name)}`,
    slug: slugify(item.name),
    name: item.name,
    description: item.description,
    priceCents: item.priceCents,
    category: item.category,
    tag: item.tag,
    bg: BG_CYCLE[i % BG_CYCLE.length],
    placeholder: `product shot — ${item.name.toLowerCase()}`,
    // Not written by the seed insert (see seed.ts) — the DB column's own default (0) applies on insert.
    stockQty: 0,
  }));
}
