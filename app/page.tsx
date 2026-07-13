import Link from "next/link";
import { FadeIn } from "@/components/motion/FadeIn";
import { Float } from "@/components/motion/Float";
import { ProductCard } from "@/components/ui/ProductCard";
import { GalleryTile } from "@/components/ui/GalleryTile";
import { getFeaturedProducts } from "@/lib/data/products";
import { getHomeGallery } from "@/lib/data/gallery";

export default function Home() {
  const products = getFeaturedProducts();
  const gallery = getHomeGallery();

  return (
    <>
      {/* HERO */}
      <section style={{ padding: "96px 48px 64px", textAlign: "center", position: "relative" }}>
        <Float
          style={{
            position: "absolute",
            top: 60,
            left: "6%",
            width: 120,
            height: 120,
            borderRadius: "48% 52% 45% 55%/55% 48% 52% 45%",
            background: "oklch(0.9 0.05 20)",
            opacity: 0.5,
          }}
          duration={9}
          distance={14}
          rotate={[-2, 1, -2]}
        >
          <span />
        </Float>
        <Float
          style={{
            position: "absolute",
            top: 220,
            right: "8%",
            width: 90,
            height: 90,
            borderRadius: "50% 50% 40% 60%/45% 55% 50% 50%",
            background: "oklch(0.88 0.05 150)",
            opacity: 0.55,
          }}
          duration={11}
          distance={10}
          rotate={[2, -1.5, 2]}
        >
          <span />
        </Float>

        <FadeIn>
          <div
            style={{
              fontSize: 13,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "oklch(0.5 0.05 20)",
              marginBottom: 18,
            }}
          >
            Handmade crochet decor
          </div>
        </FadeIn>
        <FadeIn delay={0.05}>
          <h1
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontWeight: 500,
              fontSize: "clamp(48px,7vw,88px)",
              lineHeight: 1.02,
              margin: "0 auto 22px",
              maxWidth: 920,
            }}
          >
            Every stitch, made
            <br />
            with <span style={{ fontStyle: "italic", color: "oklch(0.55 0.09 20)" }}>quiet care</span>
          </h1>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p style={{ fontSize: 17, color: "oklch(0.42 0.02 60)", maxWidth: 460, margin: "0 auto 36px", lineHeight: 1.6 }}>
            Soft amigurumi, flowers, and cozy decor — crocheted by hand, one loop at a time. Custom pieces welcome.
          </p>
        </FadeIn>
        <FadeIn delay={0.15}>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 64 }}>
            <Link
              href="/shop"
              style={{
                background: "oklch(0.28 0.02 60)",
                color: "oklch(0.98 0.01 85)",
                padding: "14px 30px",
                borderRadius: 30,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Shop the collection
            </Link>
            <Link
              href="/custom"
              style={{
                border: "1.5px solid oklch(0.28 0.02 60)",
                padding: "14px 30px",
                borderRadius: 30,
                fontSize: 14,
                fontWeight: 500,
                color: "oklch(0.28 0.02 60)",
              }}
            >
              Request custom order
            </Link>
          </div>
        </FadeIn>

        <div
          style={{
            width: "min(560px,86%)",
            aspectRatio: "5/4",
            margin: "0 auto",
            borderRadius: "44% 56% 52% 48%/58% 52% 48% 42%",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              background:
                "repeating-linear-gradient(135deg, oklch(0.9 0.04 20) 0 18px, oklch(0.94 0.03 20) 18px 36px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 13,
                color: "oklch(0.4 0.03 20)",
                background: "oklch(0.98 0.01 85 / 0.8)",
                padding: "8px 16px",
                borderRadius: 8,
              }}
            >
              hero photo — crochet bear on cream linen
            </span>
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section style={{ padding: "80px 48px 100px" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div
              style={{
                fontSize: 13,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "oklch(0.5 0.05 20)",
                marginBottom: 12,
              }}
            >
              Shop
            </div>
            <h2 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 40, margin: 0 }}>
              Loved by little rooms
            </h2>
          </div>
        </FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 32 }}>
          {products.map((p, i) => (
            <FadeIn key={p.id} delay={(i % 4) * 0.06}>
              <ProductCard product={p} />
            </FadeIn>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 56 }}>
          <Link
            href="/shop"
            style={{
              border: "1.5px solid oklch(0.28 0.02 60)",
              padding: "12px 28px",
              borderRadius: 30,
              fontSize: 14,
              fontWeight: 500,
              color: "oklch(0.28 0.02 60)",
            }}
          >
            View full shop →
          </Link>
        </div>
      </section>

      {/* ABOUT TEASER */}
      <section style={{ padding: "20px 48px 110px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
        <FadeIn>
          <div
            style={{
              aspectRatio: "4/5",
              borderRadius: 32,
              overflow: "hidden",
              background:
                "repeating-linear-gradient(115deg, oklch(0.88 0.04 150) 0 18px, oklch(0.92 0.03 150) 18px 36px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 13,
                color: "oklch(0.35 0.03 150)",
                background: "oklch(0.98 0.01 85 / 0.8)",
                padding: "8px 16px",
                borderRadius: 8,
              }}
            >
              maker photo — hands crocheting
            </span>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div>
            <div
              style={{
                fontSize: 13,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "oklch(0.5 0.05 20)",
                marginBottom: 14,
              }}
            >
              About
            </div>
            <h2
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontWeight: 500,
                fontSize: 36,
                margin: "0 0 20px",
                lineHeight: 1.15,
              }}
            >
              A small studio, made from yarn and patience
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "oklch(0.4 0.02 60)", margin: "0 0 16px" }}>
              Crochette began as a way to slow down — turning simple skeins into bears, blossoms, and little
              companions for cozy homes.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "oklch(0.4 0.02 60)", margin: 0 }}>
              Every piece is stitched by hand in small batches, so no two are quite the same.
            </p>
          </div>
        </FadeIn>
      </section>

      {/* GALLERY TEASER */}
      <section style={{ padding: "20px 48px 110px" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div
              style={{
                fontSize: 13,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "oklch(0.5 0.05 20)",
                marginBottom: 12,
              }}
            >
              Gallery
            </div>
            <h2 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 40, margin: 0 }}>
              A peek into the studio
            </h2>
          </div>
        </FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gridAutoRows: 150, gap: 20 }}>
          {gallery.map((g, i) => (
            <FadeIn key={i} delay={(i % 4) * 0.05} style={{ gridRow: `span ${g.span}` }}>
              <GalleryTile item={g} />
            </FadeIn>
          ))}
        </div>
      </section>

      {/* CUSTOM ORDER TEASER */}
      <FadeIn>
        <section
          style={{
            margin: "0 32px 110px",
            padding: "72px 48px",
            borderRadius: 36,
            background: "oklch(0.9 0.045 20)",
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr",
            gap: 56,
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "oklch(0.4 0.05 20)",
                marginBottom: 14,
              }}
            >
              Custom orders
            </div>
            <h2
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontWeight: 500,
                fontSize: 34,
                margin: "0 0 16px",
                lineHeight: 1.15,
              }}
            >
              Have something in mind?
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "oklch(0.32 0.03 20)", margin: "0 0 26px", maxWidth: 420 }}>
              Tell us the size, colors, and character — we&apos;ll turn it into a one-of-a-kind piece, made just for
              you.
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
              Start a custom request →
            </Link>
          </div>
          <div
            style={{
              aspectRatio: "1/1",
              borderRadius: 32,
              overflow: "hidden",
              background:
                "repeating-linear-gradient(135deg, oklch(0.95 0.03 20) 0 18px, oklch(0.98 0.015 20) 18px 36px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 13,
                color: "oklch(0.4 0.04 20)",
                background: "oklch(1 0 0 / 0.6)",
                padding: "8px 16px",
                borderRadius: 8,
              }}
            >
              custom order sample photo
            </span>
          </div>
        </section>
      </FadeIn>
    </>
  );
}
