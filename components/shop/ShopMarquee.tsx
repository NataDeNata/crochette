"use client";

import { useRef, useState } from "react";
import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from "framer-motion";
import { ProductCard } from "@/components/ui/ProductCard";
import type { Product } from "@/lib/data/products";

const CARD_WIDTH = 320;
const GAP = 36;
const SPEED_PX_PER_SEC = 32;

export function ShopMarquee({ products }: { products: Product[] }) {
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
      style={{ overflow: "hidden", cursor: dragging ? "grabbing" : "grab" }}
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
        style={{ display: "flex", gap: GAP, width: "max-content", x }}
      >
        {[...products, ...products].map((p, i) => (
          <div
            key={`${p.id}-${i}`}
            style={{ width: CARD_WIDTH, flexShrink: 0, pointerEvents: dragging ? "none" : undefined }}
            aria-hidden={i >= products.length || undefined}
          >
            <ProductCard product={p} />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
