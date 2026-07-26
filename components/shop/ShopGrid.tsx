"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FadeIn } from "@/components/motion/FadeIn";
import { ProductCard } from "@/components/ui/ProductCard";
import { CATEGORIES, type Product, type ProductCategory } from "@/lib/data/products";

const PAGE_SIZE = 9;

export function ShopGrid({ products }: { products: Product[] }) {
  const [active, setActive] = useState<ProductCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const reduceMotion = useReducedMotion();

  const filtered = useMemo(() => {
    const byCategory = active === "all" ? products : products.filter((p) => p.category === active);
    const q = query.trim().toLowerCase();
    return q ? byCategory.filter((p) => p.name.toLowerCase().includes(q)) : byCategory;
  }, [products, active, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function selectCategory(value: ProductCategory | "all") {
    setActive(value);
    setPage(1);
  }

  return (
    <>
      <section
        style={{
          padding: "20px 48px 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search products…"
            aria-label="Search products"
            style={{
              width: "100%",
              padding: "12px 20px",
              borderRadius: 24,
              border: "1.5px solid oklch(0.85 0.02 60)",
              fontSize: 14,
              fontFamily: "inherit",
              background: "oklch(0.98 0.01 85)",
              color: "oklch(0.28 0.02 60)",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          {CATEGORIES.map((c) => {
            const isActive = c.value === active;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => selectCategory(c.value)}
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
        </div>
      </section>

      <section style={{ padding: "48px 48px 60px" }}>
        {visible.length === 0 ? (
          <p style={{ textAlign: "center", color: "oklch(0.5 0.02 60)", fontSize: 15 }}>
            No products match &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,320px))",
              justifyContent: "center",
              gap: 32,
            }}
          >
            <AnimatePresence mode="popLayout">
              {visible.map((p, i) => (
                <FadeIn key={p.id} delay={(i % 6) * 0.05} layout exit={{ opacity: 0, scale: 0.92 }}>
                  <ProductCard product={p} />
                </FadeIn>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {totalPages > 1 && (
        <section
          aria-label="Shop pagination"
          style={{ padding: "0 48px 100px", display: "flex", justifyContent: "center", gap: 8 }}
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              aria-current={n === currentPage ? "page" : undefined}
              aria-label={`Page ${n}`}
              data-active={n === currentPage}
              className="pagination-btn"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "none",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {n}
            </button>
          ))}
        </section>
      )}
    </>
  );
}
