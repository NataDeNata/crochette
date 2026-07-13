"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FadeIn } from "@/components/motion/FadeIn";
import { ProductCard } from "@/components/ui/ProductCard";
import { CATEGORIES, type Product, type ProductCategory } from "@/lib/data/products";

export function ShopGrid({ products }: { products: Product[] }) {
  const [active, setActive] = useState<ProductCategory | "all">("all");
  const visible = active === "all" ? products : products.filter((p) => p.category === active);
  const reduceMotion = useReducedMotion();

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
                position: "relative",
                padding: "9px 20px",
                borderRadius: 20,
                border: `1.5px solid ${isActive && reduceMotion ? "oklch(0.28 0.02 60)" : isActive ? "transparent" : "oklch(0.85 0.02 60)"}`,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                background: "transparent",
                fontFamily: "inherit",
              }}
            >
              {isActive && !reduceMotion && (
                <motion.span
                  layoutId="shop-filter-active"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 20,
                    background: "oklch(0.28 0.02 60)",
                    zIndex: 0,
                  }}
                />
              )}
              <span
                style={{
                  position: "relative",
                  zIndex: 1,
                  color: isActive
                    ? reduceMotion
                      ? "oklch(0.28 0.02 60)"
                      : "oklch(0.98 0.01 85)"
                    : "oklch(0.5 0.02 60)",
                }}
              >
                {c.name}
              </span>
            </button>
          );
        })}
      </section>

      <section style={{ padding: "48px 48px 100px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 32 }}>
          <AnimatePresence mode="popLayout">
            {visible.map((p, i) => (
              <FadeIn key={p.id} delay={(i % 6) * 0.05} layout exit={{ opacity: 0, scale: 0.92 }}>
                <ProductCard product={p} />
              </FadeIn>
            ))}
          </AnimatePresence>
        </div>
      </section>
    </>
  );
}
