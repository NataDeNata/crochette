export type ProductCategory = "amigurumi" | "flowers" | "home-decor" | "baskets";

export interface Product {
  id: string;
  slug: string;
  name: string;
  description?: string;
  priceCents: number;
  category: ProductCategory;
  tag?: string;
  bg: string;
  placeholder: string;
  stockQty: number;
}

/** At or below this many left, the product page shows a "Low on Stock" notice. */
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
