import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { CATEGORIES, formatPrice, LOW_STOCK_THRESHOLD } from "@/lib/data/products";
import { getProductBySlug, getProducts } from "@/lib/data/products.server";
import { SITE_URL } from "@/lib/site";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ slug: p.slug }));
}

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
    openGraph: {
      title: `${product.name} | Crochette`,
      description,
      images: product.primaryImageUrl ? [{ url: product.primaryImageUrl }] : undefined,
    },
    twitter: {
      title: `${product.name} | Crochette`,
      description,
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? `${product.name}, handmade to order.`,
    category: categoryLabel,
    sku: product.id,
    image: product.primaryImageUrl ? [product.primaryImageUrl] : undefined,
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

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
              </FadeIn>
            </div>
          </div>
        </div>
      </section>
    </>
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
