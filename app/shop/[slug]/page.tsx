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
      title: `${product.name} — Crochette`,
      description,
      images: product.primaryImageUrl ? [{ url: product.primaryImageUrl }] : undefined,
    },
    twitter: {
      title: `${product.name} — Crochette`,
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

      <section className="pt-9 px-12 pb-0">
        <FadeIn>
          <Link href="/shop" className="text-[13px] text-[oklch(0.5_0.05_20)] inline-flex items-center gap-1.5">
            ← Back to shop
          </Link>
        </FadeIn>
      </section>

      <section className="pt-8 px-12 pb-20 grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-14 max-w-[1100px] mx-auto items-center">
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
          <div className="text-[13px] tracking-[2px] uppercase text-[oklch(0.5_0.05_20)] mb-3.5">
            {categoryLabel}
          </div>
          <h1 className="font-serif font-medium text-[clamp(32px,4vw,46px)] mb-3.5">
            {product.name}
          </h1>
          <div className="text-[22px] text-[oklch(0.4_0.05_20)] mb-2">
            {formatPrice(product.priceCents)}
          </div>
          {product.stockQty <= 0 ? (
            <div className="text-[13px] font-semibold text-[oklch(0.5_0.05_20)] mb-[22px]">
              Out of stock
            </div>
          ) : product.stockQty <= LOW_STOCK_THRESHOLD ? (
            <div className="text-[13px] font-semibold text-[oklch(0.55_0.15_40)] mb-[22px]">
              Low on Stock — only {product.stockQty} left
            </div>
          ) : (
            <div className="mb-[22px]" />
          )}
          {product.description && (
            <p className="text-[15.5px] leading-[1.75] text-[oklch(0.4_0.02_60)] max-w-[440px] mb-8">
              {product.description}
            </p>
          )}
          <div className="flex flex-col gap-[18px]">
            <AddToCartButton
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                priceCents: product.priceCents,
                stockQty: product.stockQty,
              }}
            />
            <div className="flex gap-3.5 flex-wrap">
              <Button href="/custom" variant="outline" size="md">
                Request it personalized
              </Button>
              <Link href="/contact" className="text-[13px] text-[oklch(0.5_0.05_20)] self-center">
                Have a question? Contact us
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
