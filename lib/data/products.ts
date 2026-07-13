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
