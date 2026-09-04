/** Public site origin — used for metadataBase, robots.txt, sitemap.xml, the
 * JSON-LD graph, Xendit's return URLs and every link in an outbound email.
 *
 * This was a hardcoded `https://crochette-zeta.vercel.app`, with a comment
 * asking whoever moved the site to remember to come back and edit it. That is
 * the wrong shape for a value that changes with the deployment: the constant
 * names one host, the Vercel project names another, and nothing makes them
 * agree. Both `Cro_Email_Domain.md` (Stage A, story 38) and the Cloudflare
 * plan's M6 already called for this to be read from configuration instead.
 *
 * Resolution order, and why each rung exists:
 *
 * 1. `NEXT_PUBLIC_SITE_URL` — an explicit override. This is what production
 *    sets, and it is what the eventual move to the studio's own domain will
 *    change. A trailing slash is stripped because every consumer concatenates
 *    a path onto this and `//shop` is a different URL to `/shop`.
 *
 * 2. `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL` — Vercel's own name for the
 *    project's production domain. It follows a project rename automatically,
 *    and prefers a custom domain once one is attached, so the site keeps
 *    telling the truth about itself even if rung 1 is never set. Requires
 *    "Automatically expose System Environment Variables" to stay on.
 *
 * 3. `http://localhost:3000` — local dev only. It is deliberately last and
 *    deliberately not a guessed production host: a wrong absolute URL in a
 *    sitemap is worse than an obviously local one, because it looks right.
 *
 * `NEXT_PUBLIC_` rather than a server-only variable because
 * `instrumentation-client.ts` needs the hostname inside the browser bundle.
 * Next inlines these at build time, so changing the value in a dashboard does
 * nothing until the next deploy — an env edit alone will not move the site. */
const explicitOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
const vercelProductionHost = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?.trim();

export const SITE_URL =
  explicitOrigin ||
  (vercelProductionHost ? `https://${vercelProductionHost}` : "http://localhost:3000");

/** Hostname alone, without scheme or port-less assumptions baked in by hand.
 * Sentry's `allowUrls` matches against the script URL, which carries the host
 * but not the scheme, and deriving it here is what stops that allowlist
 * drifting away from the origin the rest of the app believes in. */
export const SITE_HOST = new URL(SITE_URL).host;

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
