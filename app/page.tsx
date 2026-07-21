import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/motion/FadeIn";
import { ShopMarquee } from "@/components/shop/ShopMarquee";
import { GallerySection } from "@/components/gallery/GallerySection";
import { QuickCustomOrderForm } from "@/components/custom/QuickCustomOrderForm";
import { getProducts } from "@/lib/data/products.server";
import { getHomeGallery } from "@/lib/data/gallery";

export default async function Home() {
  const products = await getProducts();
  const gallery = getHomeGallery();

  return (
    <>
      {/* HERO */}
      <section style={{ padding: "96px 48px 80px", position: "relative", overflow: "hidden" }}>
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 0,
            opacity: 0.6,
          }}
          viewBox="0 0 1440 760"
          preserveAspectRatio="none"
        >
          <path
            d="M -40 120 C 220 40, 380 220, 620 130 S 1040 60, 1300 160 S 1520 260, 1480 340"
            fill="none"
            stroke="oklch(0.82 0.05 20)"
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0.5}
          />
          <path
            d="M -60 480 C 180 560, 340 380, 600 470 S 1000 560, 1260 460 S 1500 400, 1500 500"
            fill="none"
            stroke="oklch(0.82 0.05 150)"
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0.45}
          />
          <path
            d="M 100 680 C 320 620, 520 720, 780 660 S 1160 600, 1420 680"
            fill="none"
            stroke="oklch(0.8 0.04 60)"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.4}
          />
          <circle cx={-40} cy={120} r={6} fill="oklch(0.75 0.06 20)" opacity={0.55} />
          <circle cx={-60} cy={480} r={6} fill="oklch(0.75 0.06 150)" opacity={0.5} />
          <circle cx={100} cy={680} r={5} fill="oklch(0.72 0.05 60)" opacity={0.45} />
        </svg>

        <div
          className="hero-grid"
          style={{
            display: "grid",
            gap: 56,
            alignItems: "center",
            maxWidth: 1280,
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div>
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
                  fontSize: "clamp(40px,4.5vw,58px)",
                  lineHeight: 1.08,
                  margin: "0 0 22px",
                  maxWidth: 480,
                }}
              >
                Every stitch, made
                <br />
                with <span style={{ fontStyle: "italic", color: "oklch(0.55 0.09 20)" }}>quiet care</span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p
                style={{
                  fontSize: 17,
                  color: "oklch(0.42 0.02 60)",
                  maxWidth: 420,
                  margin: "0 0 36px",
                  lineHeight: 1.6,
                }}
              >
                Soft amigurumi, flowers, and cozy decor — crocheted by hand, one loop at a time. Custom pieces welcome.
              </p>
            </FadeIn>
            <FadeIn delay={0.15}>
              <div style={{ display: "flex", gap: 16 }}>
                <Button href="/shop">Shop the collection</Button>
                <Button href="/custom" variant="outline">
                  Request custom order
                </Button>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.15}>
            <div
              style={{
                aspectRatio: "1",
                borderRadius: 28,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <Image
                src="https://images.unsplash.com/photo-1605560213808-2c28bcfbc0b8?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1200"
                alt="A handmade crochet bear amigurumi sitting on a wooden table"
                fill
                priority
                sizes="(max-width: 760px) 90vw, 560px"
                style={{ objectFit: "cover" }}
              />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section style={{ padding: "80px 0 100px" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 52, padding: "0 48px" }}>
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
        <FadeIn>
          <ShopMarquee products={products} />
        </FadeIn>
        <div style={{ textAlign: "center", marginTop: 56, padding: "0 48px" }}>
          <Button href="/shop" variant="outline" size="md">
            View full shop →
          </Button>
        </div>
      </section>

      {/* ABOUT TEASER */}
      <section style={{ padding: "90px 48px", background: "oklch(0.92 0.025 75)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            alignItems: "center",
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          <FadeIn>
            <div
              style={{
                aspectRatio: "4/5",
                borderRadius: 32,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <Image
                src="https://images.unsplash.com/photo-1675510183251-121659ee8b87?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=900"
                alt="Close-up of hands crocheting with yarn"
                fill
                sizes="(max-width: 768px) 90vw, 480px"
                style={{ objectFit: "cover" }}
              />
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
        </div>
      </section>

      {/* GALLERY TEASER */}
      <section style={{ padding: "20px 48px 110px" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>
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
          <GallerySection items={gallery} rowHeight={150} />
        </div>
      </section>

      {/* CUSTOM ORDER TEASER */}
      <FadeIn>
        <section
          style={{
            maxWidth: 1376,
            marginLeft: "max(32px, calc(50% - 688px))",
            marginRight: "max(32px, calc(50% - 688px))",
            marginBottom: 110,
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
            <QuickCustomOrderForm />
          </div>
          <div
            style={{
              aspectRatio: "1/1",
              borderRadius: 32,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <Image
              src="https://images.unsplash.com/photo-1588090644556-14707d0e886a?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=900"
              alt="A custom crocheted bear, an example of a finished commissioned piece"
              fill
              sizes="(max-width: 768px) 90vw, 480px"
              style={{ objectFit: "cover" }}
            />
          </div>
        </section>
      </FadeIn>
    </>
  );
}
