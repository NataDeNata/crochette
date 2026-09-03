/** Public site origin. Update once a custom production domain replaces the
 * Vercel-assigned one (see update.md) — used for metadataBase, robots.txt,
 * sitemap.xml, and links in outbound emails. */
export const SITE_URL = "https://crochette-zeta.vercel.app";

/**
 * The generated link-preview card, for pages that declare their own
 * `openGraph` block.
 *
 * `app/opengraph-image.tsx` covers the whole site through the file convention
 * — but only for pages that do not declare `openGraph` themselves. A page-level
 * `openGraph` **replaces** the resolved parent object rather than merging into
 * it, so every page here that set an `openGraph` title and description was
 * silently dropping the image with it. Confirmed by inspecting the served
 * `<head>`: the homepage (no override) had `og:image`, /shop (override) did
 * not, and /shop still had `twitter:image` because it overrides only the one
 * field. Spread this into any `openGraph` block that names a title.
 */
export const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Yarns and Buttons — handmade crochet decor, stitched by hand in small batches",
};
