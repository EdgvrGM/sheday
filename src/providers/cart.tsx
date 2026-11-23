import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { CartItem } from '@/lib/types';

const STORAGE_KEY = 'sheday.cart.v1';

interface CartState {
  items: CartItem[];
  count: number;
  subtotal: number;
  preorderSubtotal: number;
  add: (item: CartItem) => void;
  setQuantity: (variantId: number, quantity: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartState | null>(null);

function readStored(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function clamp(item: CartItem, quantity: number): number {
  const max = item.isPreorder || item.maxStock == null ? 99 : item.maxStock;
  return Math.max(1, Math.min(quantity, max));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Si no se puede guardar, el carrito sigue funcionando en memoria.
    }
  }, [items]);

  const value = useMemo<CartState>(() => {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const preorderSubtotal = items
      .filter((i) => i.isPreorder)
      .reduce((s, i) => s + i.price * i.quantity, 0);
    return {
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal,
      preorderSubtotal,
      add: (item) =>
        setItems((prev) => {
          const existing = prev.find((i) => i.variantId === item.variantId);
          if (!existing) return [...prev, { ...item, quantity: clamp(item, item.quantity) }];
          return prev.map((i) =>
            i.variantId === item.variantId
              ? { ...item, quantity: clamp(item, i.quantity + item.quantity) }
              : i
          );
        }),
      setQuantity: (variantId, quantity) =>
        setItems((prev) =>
          prev.map((i) => (i.variantId === variantId ? { ...i, quantity: clamp(i, quantity) } : i))
        ),
      remove: (variantId) => setItems((prev) => prev.filter((i) => i.variantId !== variantId)),
      clear: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}
