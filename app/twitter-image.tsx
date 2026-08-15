/* Same card, second convention.
 *
 * Next fills `og:image` from `opengraph-image` and `twitter:image` from
 * `twitter-image`, and does not derive one from the other — so a site with
 * only the former still unfurls image-less on X, which is exactly the state
 * `twitter.card = "summary_large_image"` promises it won't. Re-exported rather
 * than duplicated so the two can never drift. */
export { default, alt, size, contentType } from "./opengraph-image";
