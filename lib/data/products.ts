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

export function formatPrice(priceCents: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "php",
    minimumFractionDigits: 0,
  }).format(priceCents / 100);
}
