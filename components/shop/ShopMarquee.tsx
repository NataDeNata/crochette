"use client";

import { useRef, useState } from "react";
import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from "framer-motion";
import { ProductCard } from "@/components/ui/ProductCard";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/data/products";

const SPEED_PX_PER_SEC = 32;

export function ShopMarquee({ products, onDark = false }: { products: Product[]; onDark?: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const reduceMotion = useReducedMotion();

  const wrap = () => {
    const half = (trackRef.current?.scrollWidth ?? 0) / 2;
    if (!half) return;
    let value = x.get();
    while (value <= -half) value += half;
    while (value > 0) value -= half;
    x.set(value);
  };

  useAnimationFrame((_, delta) => {
    if (reduceMotion || paused || dragging) return;
    const half = (trackRef.current?.scrollWidth ?? 0) / 2;
    if (!half) return;
    let next = x.get() - (SPEED_PX_PER_SEC * delta) / 1000;
    if (next <= -half) next += half;
    x.set(next);
  });

  return (
    <div
      className={cn("overflow-x-hidden py-3", dragging ? "cursor-grabbing" : "cursor-grab")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <motion.div
        ref={trackRef}
        drag="x"
        dragElastic={0}
        dragMomentum
        onDragStart={() => setDragging(true)}
        onDrag={wrap}
        onDragEnd={() => {
          setDragging(false);
          wrap();
        }}
        className="flex gap-9 w-max"
        style={{ x }}
      >
        {[...products, ...products].map((p, i) => (
          <div
            key={`${p.id}-${i}`}
            // CARD_WIDTH must stay a literal `w-[320px]` here (not interpolated)
            // so Tailwind's content scanner can see the class at build time.
            className={cn("w-[320px] shrink-0", dragging && "pointer-events-none")}
            aria-hidden={i >= products.length || undefined}
          >
            <ProductCard product={p} onDark={onDark} />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
