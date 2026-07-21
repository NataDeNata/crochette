import Link from "next/link";

export function Footer() {
  return (
    <footer
      style={{
        padding: "48px 48px 40px",
        background: "oklch(0.28 0.02 60)",
        color: "oklch(0.97 0.01 85)",
      }}
    >
      <div style={{ maxWidth: 1344, margin: "0 auto" }}>
        <div
          className="footer-grid"
          style={{
            display: "grid",
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
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "oklch(0.72 0.03 60)", maxWidth: 280 }}>
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
                color: "oklch(0.85 0.03 60)",
              }}
            >
              Explore
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
              <Link href="/shop" className="footer-link">Shop</Link>
              <Link href="/gallery" className="footer-link">Gallery</Link>
              <Link href="/about" className="footer-link">About</Link>
              <Link href="/custom" className="footer-link">Custom orders</Link>
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
                color: "oklch(0.85 0.03 60)",
              }}
            >
              Get in touch
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14, color: "oklch(0.72 0.03 60)" }}>
              <span>hello@crochette.shop</span>
              <span>@crochette.studio</span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 16,
            fontSize: 13,
            color: "oklch(0.6 0.025 60)",
            borderTop: "1px solid oklch(0.4 0.02 60)",
            paddingTop: 24,
            position: "relative",
          }}
        >
          <span>© 2026 Crochette. Made by hand, in small batches.</span>
          <Link
            href="/admin"
            className="footer-admin-link"
            style={{
              position: "absolute",
              right: 0,
              fontSize: 12,
            }}
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
