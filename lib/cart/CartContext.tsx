"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  quantity: number;
  stockQty: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (
    product: { id: string; slug: string; name: string; priceCents: number; stockQty: number },
    quantity: number
  ) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  subtotalCents: number;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "crochette-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Read from localStorage after mount only — avoids an SSR/client markup mismatch.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage on mount
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // Corrupt/unavailable localStorage — start with an empty cart.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const value = useMemo<CartContextValue>(() => {
    const subtotalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
    const count = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      items,
      addItem: (product, quantity) => {
        setItems((prev) => {
          const existing = prev.find((i) => i.productId === product.id);
          if (existing) {
            return prev.map((i) =>
              i.productId === product.id
                ? { ...i, stockQty: product.stockQty, quantity: Math.min(i.quantity + quantity, product.stockQty) }
                : i
            );
          }
          return [
            ...prev,
            {
              productId: product.id,
              slug: product.slug,
              name: product.name,
              priceCents: product.priceCents,
              stockQty: product.stockQty,
              quantity: Math.min(quantity, product.stockQty),
            },
          ];
        });
      },
      removeItem: (productId) => setItems((prev) => prev.filter((i) => i.productId !== productId)),
      setQuantity: (productId, quantity) =>
        setItems((prev) =>
          quantity <= 0
            ? prev.filter((i) => i.productId !== productId)
            : prev.map((i) =>
                i.productId === productId ? { ...i, quantity: Math.min(quantity, i.stockQty) } : i
              )
        ),
      clear: () => setItems([]),
      subtotalCents,
      count,
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
