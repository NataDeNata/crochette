"use client";

import { useState } from "react";
import { FadeIn } from "@/components/motion/FadeIn";
import { ProductCard } from "@/components/ui/ProductCard";
import { CATEGORIES, type Product, type ProductCategory } from "@/lib/data/products";

export function ShopGrid({ products }: { products: Product[] }) {
  const [active, setActive] = useState<ProductCategory | "all">("all");
  const visible = active === "all" ? products : products.filter((p) => p.category === active);

  return (
    <>
      <section style={{ padding: "20px 48px 0", display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
        {CATEGORIES.map((c) => {
          const isActive = c.value === active;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => setActive(c.value)}
              style={{
                padding: "9px 20px",
                borderRadius: 20,
                border: `1.5px solid ${isActive ? "oklch(0.28 0.02 60)" : "oklch(0.85 0.02 60)"}`,
                fontSize: 13,
                fontWeight: 500,
                color: isActive ? "oklch(0.28 0.02 60)" : "oklch(0.5 0.02 60)",
                cursor: "pointer",
                background: "transparent",
                fontFamily: "inherit",
              }}
            >
              {c.name}
            </button>
          );
        })}
      </section>

      <section style={{ padding: "48px 48px 100px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 32 }}>
          {visible.map((p, i) => (
            <FadeIn key={p.id} delay={(i % 6) * 0.05}>
              <ProductCard product={p} />
            </FadeIn>
          ))}
        </div>
      </section>
    </>
  );
}
