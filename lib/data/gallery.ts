import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { productImages, products } from "@/lib/db/schema";
import { BG_CYCLE_CLASSES } from "./bg-cycle";

export interface GalleryItem {
  placeholder: string;
  bgClassName: string;
  span: number;
  /** Real photo URL. When present, tiles render this instead of the placeholder block. */
  image?: string;
  alt?: string;
}

/** Alternating 2/1/1/2/1/2/1/1 tile-span rhythm — the curated set's length is
 * admin-controlled and variable, so this replaces the old fixed HOME_SPANS/
 * FULL_SPANS arrays with the same visual rhythm applied cyclically. */
const SPAN_RHYTHM = [2, 1, 1, 2, 1, 2, 1, 1];

async function fetchFeaturedGalleryImages(limit: number): Promise<GalleryItem[]> {
  const rows = await db
    .select({
      url: productImages.url,
      alt: productImages.alt,
      caption: productImages.caption,
      productName: products.name,
    })
    .from(productImages)
    .innerJoin(products, eq(productImages.productId, products.id))
    .where(eq(productImages.galleryFeatured, true))
    .orderBy(asc(productImages.galleryOrder))
    .limit(limit);

  return rows.map((row, i) => ({
    image: row.url,
    alt: row.alt || row.caption || row.productName,
    placeholder: `gallery: ${row.productName.toLowerCase()}`,
    bgClassName: BG_CYCLE_CLASSES[i % BG_CYCLE_CLASSES.length],
    span: SPAN_RHYTHM[i % SPAN_RHYTHM.length],
  }));
}

/** 8-item teaser grid — Home page. Admin-curated via /admin/gallery. */
export async function getHomeGallery(): Promise<GalleryItem[]> {
  return fetchFeaturedGalleryImages(8);
}

/** Full curated grid — Gallery page. Capped so an unusually large curated
 * set doesn't blow out the page. */
export async function getFullGallery(): Promise<GalleryItem[]> {
  return fetchFeaturedGalleryImages(24);
}
