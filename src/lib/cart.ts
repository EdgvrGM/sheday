"use client";

import { useSyncExternalStore } from "react";

import type { CartItem } from "./types";

// Bolsa de compras (en el código: "cart"), guardada en localStorage y compartida entre pestañas.

const STORAGE_KEY = "sheday.cart.v1";
const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let cache: CartItem[] | null = null;

function read(): CartItem[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as CartItem[]) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(items: CartItem[]) {
  cache = items;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Modo privado o almacenamiento lleno: sigue en memoria.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function clamp(item: CartItem, quantity: number): number {
  const max = item.isPreorder || item.maxStock == null ? 99 : item.maxStock;
  return Math.max(1, Math.min(quantity, max));
}

export const cartActions = {
  add(item: CartItem) {
    const prev = read();
    const existing = prev.find((i) => i.variantId === item.variantId);
    write(
      existing
        ? prev.map((i) =>
            i.variantId === item.variantId ? { ...item, quantity: clamp(item, i.quantity + item.quantity) } : i
          )
        : [...prev, { ...item, quantity: clamp(item, item.quantity) }]
    );
  },
  setQuantity(variantId: number, quantity: number) {
    write(read().map((i) => (i.variantId === variantId ? { ...i, quantity: clamp(i, quantity) } : i)));
  },
  remove(variantId: number) {
    write(read().filter((i) => i.variantId !== variantId));
  },
  clear() {
    write(EMPTY);
  },
};

/** Estado de la bolsa. En el servidor (y antes de hidratar) siempre está vacío. */
export function useCart() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const preorderSubtotal = items.filter((i) => i.isPreorder).reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  return { items, subtotal, preorderSubtotal, count, ...cartActions };
}
