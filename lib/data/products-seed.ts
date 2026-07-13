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
  priceCents: number;
  category: ProductCategory;
  tag?: string;
}> = [
  { name: "Milo the Bear", priceCents: 3200, category: "amigurumi", tag: "Bestseller" },
  { name: "Sunny Daisy Bouquet", priceCents: 2400, category: "flowers" },
  { name: "Cloud Basket", priceCents: 2800, category: "baskets" },
  { name: "Little Fox Friend", priceCents: 3600, category: "amigurumi", tag: "New" },
  { name: "Rosebud Coaster Set", priceCents: 1800, category: "home-decor" },
  { name: "Petal Garland", priceCents: 2200, category: "flowers", tag: "New" },
  { name: "Bumble the Bee", priceCents: 3000, category: "amigurumi" },
  { name: "Meadow Wall Hanging", priceCents: 4400, category: "home-decor" },
  { name: "Tiny Turtle Duo", priceCents: 2600, category: "amigurumi" },
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
    priceCents: item.priceCents,
    category: item.category,
    tag: item.tag,
    bg: BG_CYCLE[i % BG_CYCLE.length],
    placeholder: `product shot — ${item.name.toLowerCase()}`,
  }));
}
