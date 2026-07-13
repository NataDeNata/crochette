export type ProductCategory = "amigurumi" | "flowers" | "home-decor" | "baskets";

export interface Product {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  category: ProductCategory;
  tag?: string;
  bg: string;
  placeholder: string;
}

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

const PRODUCTS: Product[] = CATALOG.map((item, i) => ({
  id: `p_${slugify(item.name)}`,
  slug: slugify(item.name),
  name: item.name,
  priceCents: item.priceCents,
  category: item.category,
  tag: item.tag,
  bg: BG_CYCLE[i % BG_CYCLE.length],
  placeholder: `product shot — ${item.name.toLowerCase()}`,
}));

/** Full catalog — Shop page. */
export function getProducts(): Product[] {
  return PRODUCTS;
}

/** First 4 — Home page "Loved by little rooms" teaser. */
export function getFeaturedProducts(): Product[] {
  return PRODUCTS.slice(0, 4);
}

export const CATEGORIES: { name: string; value: ProductCategory | "all" }[] = [
  { name: "All", value: "all" },
  { name: "Amigurumi", value: "amigurumi" },
  { name: "Flowers", value: "flowers" },
  { name: "Home decor", value: "home-decor" },
  { name: "Baskets", value: "baskets" },
];

export function formatPrice(priceCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "usd",
    minimumFractionDigits: 0,
  }).format(priceCents / 100);
}
