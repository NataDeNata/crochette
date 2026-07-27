"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FadeIn } from "@/components/motion/FadeIn";
import { ProductCard } from "@/components/ui/ProductCard";
import { CATEGORIES, type Product, type ProductCategory } from "@/lib/data/products";
import { cn } from "@/lib/utils";

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
      <section className="pt-5 px-12 pb-0 flex flex-col items-center gap-6">
        <div className="w-full max-w-[420px]">
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search products…"
            aria-label="Search products"
            className="w-full py-3 px-5 rounded-[24px] border-[1.5px] border-[oklch(0.85_0.02_60)] text-sm [font-family:inherit] bg-card text-foreground"
          />
        </div>

        <div className="flex gap-3.5 justify-center flex-wrap">
          {CATEGORIES.map((c) => {
            const isActive = c.value === active;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => selectCategory(c.value)}
                className={cn(
                  "relative py-[9px] px-5 rounded-[20px] border-[1.5px] text-[13px] font-medium cursor-pointer bg-transparent [font-family:inherit]",
                  isActive && reduceMotion
                    ? "border-[oklch(0.28_0.02_60)]"
                    : isActive
                      ? "border-transparent"
                      : "border-[oklch(0.85_0.02_60)]",
                )}
              >
                {isActive && !reduceMotion && (
                  <motion.span
                    layoutId="shop-filter-active"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    className="absolute inset-0 rounded-[20px] bg-primary z-0"
                  />
                )}
                <span
                  className={cn(
                    "relative z-[1]",
                    isActive ? (reduceMotion ? "text-primary" : "text-card") : "text-muted-foreground",
                  )}
                >
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="pt-12 px-12 pb-[60px]">
        {visible.length === 0 ? (
          <p className="text-center text-muted-foreground text-[15px]">
            No products match &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,320px))] justify-center gap-8">
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
        <section aria-label="Shop pagination" className="px-12 pb-[100px] flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              aria-current={n === currentPage ? "page" : undefined}
              aria-label={`Page ${n}`}
              className={cn(
                "w-9 h-9 rounded-full border-0 text-sm font-medium cursor-pointer [font-family:inherit] transition-colors duration-200",
                n === currentPage
                  ? "bg-primary text-card"
                  : "bg-transparent text-[oklch(0.42_0.02_60)] hover:bg-[oklch(0.9_0.02_60)] focus-visible:bg-[oklch(0.9_0.02_60)]",
              )}
            >
              {n}
            </button>
          ))}
        </section>
      )}
    </>
  );
}
