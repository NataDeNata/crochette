import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/motion/FadeIn";
import { ShopGrid } from "@/components/shop/ShopGrid";
import { getProducts } from "@/lib/data/products";

export const metadata: Metadata = {
  title: "Shop — Crochette",
  description: "Amigurumi, flowers, and cozy decor — every piece made by hand, in small batches.",
};

export default function ShopPage() {
  const products = getProducts();

  return (
    <>
      <section style={{ padding: "72px 48px 40px", textAlign: "center" }}>
        <FadeIn>
          <div
            style={{
              fontSize: 13,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "oklch(0.5 0.05 20)",
              marginBottom: 16,
            }}
          >
            Shop
          </div>
          <h1
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontWeight: 500,
              fontSize: "clamp(38px,5vw,58px)",
              margin: "0 0 16px",
            }}
          >
            The full collection
          </h1>
          <p style={{ fontSize: 16, color: "oklch(0.42 0.02 60)", maxWidth: 460, margin: "0 auto", lineHeight: 1.6 }}>
            Amigurumi, flowers, and cozy decor — every piece made by hand, in small batches.
          </p>
        </FadeIn>
      </section>

      <ShopGrid products={products} />

      <FadeIn>
        <section
          style={{
            margin: "0 32px 100px",
            padding: "56px 48px",
            borderRadius: 36,
            background: "oklch(0.9 0.045 20)",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 30, margin: "0 0 14px" }}>
            Don&apos;t see quite what you want?
          </h2>
          <p style={{ fontSize: 15, color: "oklch(0.32 0.03 20)", margin: "0 0 24px" }}>
            We make custom pieces too — any color, size, or character.
          </p>
          <Link
            href="/custom"
            style={{
              background: "oklch(0.28 0.02 60)",
              color: "oklch(0.98 0.01 85)",
              padding: "14px 30px",
              borderRadius: 30,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Request a custom order
          </Link>
        </section>
      </FadeIn>
    </>
  );
}
