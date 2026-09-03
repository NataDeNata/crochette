import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { Cutout } from "@/components/ui/Cutout";
import { CATEGORIES, formatPrice, LOW_STOCK_THRESHOLD } from "@/lib/data/products";
import { getProductBySlug, getProducts } from "@/lib/data/products.server";
import { JsonLd } from "@/components/seo/JsonLd";
import { OG_IMAGE, SITE_URL } from "@/lib/site";

/* `generateStaticParams` was removed here. It could never have taken effect:
 * `app/layout.tsx` awaits `auth()` unconditionally, which forces the whole tree
 * dynamic, so this route is rendered per request and Next never asks for a
 * param list. The proof is CI — it runs `next build` with no repository secret
 * and therefore no DATABASE_URL, and `lib/db/index.ts` throws without one, so a
 * build that actually called this would fail rather than pass. Restoring it
 * means removing the unconditional `auth()` from the root layout first. */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };

  const description = product.description ?? `${product.name}, handmade to order.`;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/shop/${product.slug}` },
    openGraph: {
      title: `${product.name} | Yarns and Buttons`,
      description,
      // Falls back to the site card rather than to nothing: a product with no
      // photograph uploaded yet would otherwise unfurl bare, and a page-level
      // `openGraph` block replaces the parent's rather than merging with it,
      // so there is no inherited image to fall through to.
      images: [product.primaryImageUrl ? { url: product.primaryImageUrl } : OG_IMAGE],
    },
    twitter: {
      title: `${product.name} | Yarns and Buttons`,
      description,
      images: [product.primaryImageUrl ?? OG_IMAGE.url],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const categoryLabel = CATEGORIES.find((c) => c.value === product.category)?.name ?? product.category;

  /* Four more from the same category. `getProducts()` is the same read
   * `getProductBySlug` already went through, and that read is now `cache()`d
   * per request, so this costs no query at all rather than a trip per card — and
   * a shopper who has decided this particular bear isn't it has somewhere to go
   * other than back. */
  const related = (await getProducts())
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? `${product.name}, handmade to order.`,
    category: categoryLabel,
    sku: product.id,
    image: product.primaryImageUrl ? [product.primaryImageUrl] : undefined,
    // The same specs the page now prints, in the vocabulary a crawler reads.
    // `size` is free text here for the same reason the column is: hand-crochet
    // does not have the precision a QuantitativeValue implies.
    ...(product.dimensions ? { size: product.dimensions } : {}),
    ...(product.materials ? { material: product.materials } : {}),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/shop/${product.slug}`,
      priceCurrency: "PHP",
      price: (product.priceCents / 100).toFixed(2),
      availability:
        product.stockQty > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* One figure, at plate scale, on its own sheet. Every colour on this
          page used to be a hardcoded cream-palette oklch literal — five of
          them, which is why the page never followed a repaint. Tokens now. */}
      <section className="bg-sheet">
        <div className="page-gutter py-8 sm:py-10 lg:py-12">
          <div className="max-w-[1100px] mx-auto">
            {/* The one row of this shape that stays. Its siblings on the other
                routes were the artifact naming itself and went with the rest of
                the press-sheet furniture; this one is a back link and a
                category, which is wayfinding a visitor deep in the catalogue
                actually needs. The label drops "sheets" for the same reason the
                rest did — it named the metaphor rather than the destination. */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b-2 border-keyline pb-3">
              <Link href="/shop" className="type-sheet-spec inline-flex items-center gap-2 text-keyline">
                <BackMark />
                Back to shop
              </Link>
              <p className="type-sheet-spec text-keyline/70">{categoryLabel}</p>
            </div>

            {/* `min(320px,100%)` so the single surviving track can drop below
                320px on a narrow screen — a flat 320px minimum overflows
                instead of collapsing. Same fix as CheckoutForm's summary. */}
            <div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-10 md:gap-14 items-start">
              <FadeIn>
                <ProductGallery
                  images={product.images}
                  productName={product.name}
                  tag={product.tag}
                  bgClassName={product.bgClassName}
                  placeholder={product.placeholder}
                />
              </FadeIn>

              <FadeIn delay={0.08}>
                <h1 className="type-sheet-display text-[clamp(34px,4.4vw,56px)] text-keyline text-balance">
                  {product.name}
                </h1>

                <p className="type-sheet-display text-press-red text-[26px] tabular-nums mt-4">
                  {formatPrice(product.priceCents)}
                </p>

                {/* Stock, in the sheet's own words. Sold out is "pressed out"
                    here as well as on the figure, so the two surfaces agree. */}
                {product.stockQty <= 0 ? (
                  <p className="type-sheet-spec mt-3 inline-block border-2 border-keyline bg-secondary px-2.5 py-1.5 text-keyline/70">
                    Sold out. None left in stock.
                  </p>
                ) : product.stockQty <= LOW_STOCK_THRESHOLD ? (
                  <p className="type-sheet-spec mt-3 inline-block border-2 border-keyline bg-butter px-2.5 py-1.5 text-keyline">
                    Only {product.stockQty} left
                  </p>
                ) : null}

                {product.description && (
                  <p className="text-[16px] leading-[1.7] text-muted-foreground max-w-[52ch] mt-7">
                    {product.description}
                  </p>
                )}

                <div className="mt-9 flex flex-col gap-5">
                  <AddToCartButton
                    product={{
                      id: product.id,
                      slug: product.slug,
                      name: product.name,
                      priceCents: product.priceCents,
                      stockQty: product.stockQty,
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-4">
                    <Button href="/custom" variant="outline" size="md">
                      Request it personalized
                    </Button>
                    <Link href="/contact" className="text-[14px] text-press-red">
                      Have a question?
                    </Link>
                  </div>
                </div>

                {/* The specs. This column used to end at the buttons — one
                    sentence of description and nothing else — on a ₱950 piece
                    bought sight-unseen, where size and materials are the two
                    things a shopper cannot work out from a photograph.
                    Each row renders only when the studio has filled it in, so
                    a product with none of them looks exactly as it did. */}
                <dl className="mt-10 flex flex-col border-t-2 border-keyline">
                  {product.dimensions && <Spec term="Size">{product.dimensions}</Spec>}
                  {product.materials && <Spec term="Made of">{product.materials}</Spec>}
                  {product.careInstructions && (
                    <Spec term="Care">{product.careInstructions}</Spec>
                  )}
                  {/* Not conditional: every piece has a delivery answer, and
                      "how long until it reaches me" is the question the review
                      found no page on this site answered at all. */}
                  <Spec term="Delivery">
                    {product.stockQty > 0
                      ? "In stock and packed within 1–2 working days."
                      : "Made to order once back in stock."}{" "}
                    <Link href="/shipping" className="underline">
                      Shipping and timings
                    </Link>
                  </Spec>
                </dl>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="bg-sheet">
          <div className="page-gutter pb-14 pt-2 sm:pb-16">
            <div className="mx-auto max-w-[1100px]">
              <div className="mb-10 border-t border-keyline/15" />
              <h2 className="type-sheet-display mb-8 text-[clamp(22px,3vw,32px)] text-keyline">
                More {categoryLabel.toLowerCase()}
              </h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 sm:gap-x-8">
                {related.map((p) => (
                  <Cutout key={p.id} product={p} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/* One line of the specs table: a dashed rule, the term in the sheet's small
 * caps, the value in reading type. `<dt>`/`<dd>` rather than two spans, so the
 * pairing is in the markup and not only in the layout. */
function Spec({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-dashed border-keyline/40 py-3.5 sm:flex-row sm:gap-6">
      <dt className="type-sheet-spec shrink-0 text-keyline/60 sm:w-[104px]">{term}</dt>
      <dd className="text-[15px] leading-[1.6] text-muted-foreground">{children}</dd>
    </div>
  );
}

/* Drawn at the keyline weight, pointing back the way you came. */
function BackMark() {
  return (
    <svg aria-hidden width="16" height="12" viewBox="0 0 16 12" fill="none" className="shrink-0">
      <path
        d="M15 6H1.5M6 1.5 1.5 6 6 10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />
    </svg>
  );
}
