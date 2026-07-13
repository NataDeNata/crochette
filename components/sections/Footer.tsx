import Link from "next/link";

export function Footer() {
  return (
    <footer style={{ padding: "48px 48px 40px", borderTop: "1px solid oklch(0.9 0.015 60)" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr",
          gap: 48,
          marginBottom: 48,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontSize: 26,
              fontStyle: "italic",
              fontWeight: 600,
              marginBottom: 14,
            }}
          >
            Crochette
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "oklch(0.45 0.02 60)", maxWidth: 280 }}>
            Handmade crochet decor and companions, stitched with quiet care.
          </p>
        </div>

        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 16,
              color: "oklch(0.4 0.03 60)",
            }}
          >
            Explore
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
            <Link href="/shop" style={{ color: "oklch(0.4 0.02 60)" }}>Shop</Link>
            <Link href="/gallery" style={{ color: "oklch(0.4 0.02 60)" }}>Gallery</Link>
            <Link href="/about" style={{ color: "oklch(0.4 0.02 60)" }}>About</Link>
            <Link href="/custom" style={{ color: "oklch(0.4 0.02 60)" }}>Custom orders</Link>
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 16,
              color: "oklch(0.4 0.03 60)",
            }}
          >
            Get in touch
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14, color: "oklch(0.4 0.02 60)" }}>
            <span>hello@crochette.shop</span>
            <span>@crochette.studio</span>
          </div>
        </div>
      </div>

      <div
        style={{
          textAlign: "center",
          fontSize: 13,
          color: "oklch(0.55 0.02 60)",
          borderTop: "1px solid oklch(0.9 0.015 60)",
          paddingTop: 24,
        }}
      >
        © 2026 Crochette. Made by hand, in small batches.
      </div>
    </footer>
  );
}
