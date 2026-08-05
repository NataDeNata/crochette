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
      <section className="pt-5 page-gutter pb-0 flex flex-col items-center gap-6">
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
            className="w-full py-3 px-4 rounded-lg border border-input text-sm [font-family:inherit] bg-card text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Filters follow the board's button pair: outlined at rest, charcoal
            fill when active. Vermilion is deliberately not spent here — it is
            reserved for the stamp and for directional arrows, and a world with
            one accent stays coherent only if that rule holds everywhere. */}
        <div className="flex justify-center flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const isActive = c.value === active;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => selectCategory(c.value)}
                aria-pressed={isActive}
                className={cn(
                  "relative py-3 px-5 rounded-lg type-akari-label cursor-pointer border border-border overflow-hidden",
                  isActive && reduceMotion ? "bg-ink text-washi" : "bg-transparent",
                )}
              >
                {isActive && !reduceMotion && (
                  <motion.span
                    layoutId="shop-filter-active"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    className="absolute inset-0 bg-ink z-0"
                  />
                )}
                <span
                  className={cn(
                    "relative z-[1]",
                    isActive ? "text-washi" : "text-muted-foreground",
                  )}
                >
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="pt-12 page-gutter pb-[60px]">
        {visible.length === 0 ? (
          <p className="text-center text-muted-foreground text-[15px]">
            No products match &ldquo;{query}&rdquo;.
          </p>
        ) : (
          // Cards sit apart on the paper ground with real air between them.
          // `auto-fill` with a 1fr max so the row always closes flush to both
          // gutters rather than leaving a ragged right edge.
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-8 sm:gap-10">
            <AnimatePresence mode="popLayout">
              {visible.map((p, i) => (
                <FadeIn
                  key={p.id}
                  delay={(i % 6) * 0.05}
                  layout
                  // Opacity only on exit. Scaling a card on its way out drags
                  // the reflow with it, and the grid visibly stutters.
                  exit={{ opacity: 0 }}
                >
                  <ProductCard product={p} />
                </FadeIn>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Same button vocabulary as the filters: outlined, charcoal when current. */}
      {totalPages > 1 && (
        <section aria-label="Shop pagination" className="page-gutter pb-[100px] flex justify-center">
          <div className="flex gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                aria-current={n === currentPage ? "page" : undefined}
                aria-label={`Page ${n}`}
                className={cn(
                  // 44px on touch, back to 36px from `sm` up.
                  "w-11 h-11 sm:w-9 sm:h-9 rounded-lg border border-border type-akari-label cursor-pointer transition-colors duration-200",
                  n === currentPage
                    ? "bg-ink text-washi"
                    : "bg-background text-muted-foreground hover:bg-ash hover:text-ink focus-visible:bg-ash focus-visible:text-ink",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
