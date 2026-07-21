import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/motion/FadeIn";
import { GallerySection } from "@/components/gallery/GallerySection";
import { getFullGallery } from "@/lib/data/gallery";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Works in progress, finished pieces, and the little moments in between.",
  openGraph: {
    title: "Gallery — Crochette",
    description: "Works in progress, finished pieces, and the little moments in between.",
  },
};

export default function GalleryPage() {
  const gallery = getFullGallery();

  return (
    <>
      <section style={{ padding: "72px 48px 48px", textAlign: "center" }}>
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
            Gallery
          </div>
          <h1
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontWeight: 500,
              fontSize: "clamp(38px,5vw,58px)",
              margin: "0 0 16px",
            }}
          >
            A peek into the studio
          </h1>
          <p style={{ fontSize: 16, color: "oklch(0.42 0.02 60)", maxWidth: 460, margin: "0 auto", lineHeight: 1.6 }}>
            Works in progress, finished pieces, and the little moments in between.
          </p>
        </FadeIn>
      </section>

      <section style={{ padding: "20px 48px 100px" }}>
        <GallerySection items={gallery} rowHeight={180} />
      </section>

      <FadeIn>
        <section
          style={{
            margin: "0 32px 100px",
            padding: "56px 48px",
            borderRadius: 36,
            background: "oklch(0.91 0.04 150)",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 30, margin: "0 0 14px" }}>
            Follow along on Instagram
          </h2>
          <p style={{ fontSize: 15, color: "oklch(0.3 0.03 150)", margin: "0 0 24px" }}>
            New pieces, works in progress, and behind-the-scenes.
          </p>
          <Button href="https://instagram.com">@crochette.studio</Button>
        </section>
      </FadeIn>
    </>
  );
}
