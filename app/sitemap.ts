import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/data/products.server";
import { SITE_URL } from "@/lib/site";

const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/shop", changeFrequency: "daily", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.5 },
  { path: "/gallery", changeFrequency: "weekly", priority: 0.5 },
  { path: "/custom", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();
  const now = new Date();

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${SITE_URL}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...products.map((product) => ({
      url: `${SITE_URL}/shop/${product.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
