import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FadeIn } from "@/components/motion/FadeIn";
import { CATEGORIES, formatPrice } from "@/lib/data/products";
import { getProductBySlug, getProducts } from "@/lib/data/products.server";

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
  if (!product) return { title: "Product not found — Crochette" };

  return {
    title: `${product.name} — Crochette`,
    description: product.description ?? `${product.name}, handmade to order.`,
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

  return (
    <>
      <section style={{ padding: "36px 48px 0" }}>
        <FadeIn>
          <Link
            href="/shop"
            style={{
              fontSize: 13,
              color: "oklch(0.5 0.05 20)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ← Back to shop
          </Link>
        </FadeIn>
      </section>

      <section
        style={{
          padding: "32px 48px 80px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
          gap: 56,
          maxWidth: 1100,
          margin: "0 auto",
          alignItems: "center",
        }}
      >
        <FadeIn>
          <div
            style={{
              position: "relative",
              aspectRatio: "1",
              borderRadius: 28,
              overflow: "hidden",
              background: product.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {product.tag && (
              <div
                style={{
                  position: "absolute",
                  top: 18,
                  left: 18,
                  background: "oklch(0.98 0.01 85 / 0.9)",
                  padding: "6px 14px",
                  borderRadius: 16,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  color: "oklch(0.5 0.09 20)",
                }}
              >
                {product.tag}
              </div>
            )}
            <span
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 13,
                color: "oklch(0.35 0.03 60)",
                background: "oklch(1 0 0 / 0.6)",
                padding: "7px 14px",
                borderRadius: 8,
                textAlign: "center",
              }}
            >
              {product.placeholder}
            </span>
          </div>
        </FadeIn>

        <FadeIn delay={0.08}>
          <div
            style={{
              fontSize: 13,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "oklch(0.5 0.05 20)",
              marginBottom: 14,
            }}
          >
            {categoryLabel}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontWeight: 500,
              fontSize: "clamp(32px,4vw,46px)",
              margin: "0 0 14px",
            }}
          >
            {product.name}
          </h1>
          <div style={{ fontSize: 22, color: "oklch(0.4 0.05 20)", marginBottom: 22 }}>
            {formatPrice(product.priceCents)}
          </div>
          {product.description && (
            <p style={{ fontSize: 15.5, lineHeight: 1.75, color: "oklch(0.4 0.02 60)", maxWidth: 440, margin: "0 0 32px" }}>
              {product.description}
            </p>
          )}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link
              href="/contact"
              style={{
                background: "oklch(0.28 0.02 60)",
                color: "oklch(0.98 0.01 85)",
                padding: "14px 30px",
                borderRadius: 30,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Ask about this piece
            </Link>
            <Link
              href="/custom"
              style={{
                border: "1.5px solid oklch(0.75 0.03 20)",
                color: "oklch(0.28 0.02 60)",
                padding: "13px 26px",
                borderRadius: 30,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Request it personalized
            </Link>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
