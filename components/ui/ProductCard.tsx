import type { Product } from "@/lib/data/products";
import { formatPrice } from "@/lib/data/products";

export function ProductCard({ product }: { product: Product }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        className="hover-lift"
        style={{
          aspectRatio: "1",
          borderRadius: 20,
          overflow: "hidden",
          background: product.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {product.tag && (
          <div
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              background: "oklch(0.98 0.01 85 / 0.9)",
              padding: "5px 12px",
              borderRadius: 14,
              fontSize: 11,
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
            fontSize: 12,
            color: "oklch(0.35 0.03 60)",
            background: "oklch(1 0 0 / 0.6)",
            padding: "6px 12px",
            borderRadius: 6,
            textAlign: "center",
          }}
        >
          {product.placeholder}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>{product.name}</span>
        <span style={{ fontSize: 14, color: "oklch(0.5 0.05 20)" }}>
          {formatPrice(product.priceCents)}
        </span>
      </div>
    </div>
  );
}
