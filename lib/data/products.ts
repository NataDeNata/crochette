export type ProductCategory = "amigurumi" | "flowers" | "home-decor" | "baskets";

export interface ProductImage {
  id: string;
  url: string;
  position: number;
  isPrimary: boolean;
  caption?: string;
  alt?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description?: string;
  priceCents: number;
  category: ProductCategory;
  tag?: string;
  /** Studio-entered specs. Each is absent until the owner fills it in, and the
   * product page renders only the ones that are present. */
  dimensions?: string;
  materials?: string;
  careInstructions?: string;
  bgClassName: string;
  placeholder: string;
  stockQty: number;
  /** Ordered by position asc. Empty until the admin uploads real photos. */
  images: ProductImage[];
  /** The `isPrimary` image's url, or images[0], or undefined when none exist. */
  primaryImageUrl?: string;
}

/** At or below this many left, the product page shows a "Low on Stock" notice.
 * Storefront-only urgency signal, deliberately uniform across the catalog — NOT
 * the same number as `products.low_stock_threshold`, which is the admin's
 * per-product restock alert (see `lowStockCondition` in lib/db/inventory.ts).
 * The duplication is intentional: one is a conversion lever aimed at customers,
 * the other is an operational trigger aimed at the studio owner, and they have
 * no reason to share a value. */
export const LOW_STOCK_THRESHOLD = 5;

export const CATEGORIES: { name: string; value: ProductCategory | "all" }[] = [
  { name: "All", value: "all" },
  { name: "Amigurumi", value: "amigurumi" },
  { name: "Flowers", value: "flowers" },
  { name: "Home decor", value: "home-decor" },
  { name: "Baskets", value: "baskets" },
];

/**
 * How many pieces a shopper could actually buy right now.
 *
 * NOT `products.length`. `getProducts()` selects on `status = 'active'`, which
 * includes a piece whose stock has reached zero — the storefront still renders
 * it, marked sold out, because a sold-out piece is evidence the studio makes
 * things people want. So the catalogue length and the buyable count are two
 * different numbers, and the homepage hero claimed the first while saying the
 * second: "10 pieces available today" over a grid where one read "Sold out".
 */
export function availableCount(products: Product[]): number {
  return products.reduce((n, p) => (p.stockQty > 0 ? n + 1 : n), 0);
}

export function formatPrice(priceCents: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "php",
    minimumFractionDigits: 0,
  }).format(priceCents / 100);
}
