"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { formatMoney } from "./format";
import { getSupabase } from "./supabase/browser";
import type { CartItem, ProductMode } from "./types";

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

interface VariantRow {
  id: number;
  size: string;
  color: string;
  stock: number;
  products: {
    id: number;
    name: string;
    price: number | string;
    mode: ProductMode;
    is_active: boolean;
    product_images: { id: number; path: string; sort_order: number }[];
  } | null;
}

/**
 * La bolsa guarda precio y stock del momento en que se agregó la pieza, pero
 * `place_order` cobra lo que diga la BD. Esto la pone al día (precio, nombre,
 * foto, stock) y quita lo que ya no se puede pedir.
 * Regresa los avisos para la clienta (vacío si nada cambió).
 */
let inFlight: Promise<string[]> | null = null;

export function syncCart(sb: SupabaseClient): Promise<string[]> {
  // Dos componentes (o el doble efecto de React en desarrollo) comparten la misma
  // revisión; si no, la segunda no ve cambios y borra los avisos de la primera.
  inFlight ??= runSync(sb).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runSync(sb: SupabaseClient): Promise<string[]> {
  const before = read();
  if (before.length === 0) return [];

  const { data, error } = await sb
    .from("product_variants")
    .select("id, size, color, stock, products(id, name, price, mode, is_active, product_images(id, path, sort_order))")
    .in(
      "id",
      before.map((i) => i.variantId)
    );
  if (error) throw error;

  const byId = new Map((data as unknown as VariantRow[]).map((r) => [r.id, r]));
  const changes: string[] = [];
  const next: CartItem[] = [];

  // Se compara con lo que haya AHORA (pudo cambiar mientras llegaba la respuesta)
  for (const item of read()) {
    const row = byId.get(item.variantId);
    const p = row?.products;
    if (!row || !p || !p.is_active) {
      changes.push(`«${item.name}» ya no está disponible y la quitamos de tu bolsa.`);
      continue;
    }
    const option = [row.size, row.color].filter(Boolean).join(", ");
    const isPreorder = p.mode === "preorder";
    if (!isPreorder && row.stock <= 0) {
      changes.push(`«${p.name}» (${option}) se agotó y la quitamos de tu bolsa.`);
      continue;
    }

    const price = Number(p.price);
    if (price !== item.price) changes.push(`El precio de «${p.name}» cambió a ${formatMoney(price)}.`);

    const maxStock = isPreorder ? null : row.stock;
    let quantity = item.quantity;
    if (maxStock != null && quantity > maxStock) {
      quantity = maxStock;
      changes.push(
        `De «${p.name}» (${option}) solo ${maxStock === 1 ? "queda 1 pieza" : `quedan ${maxStock} piezas`}; ajustamos la cantidad.`
      );
    }

    const cover = [...p.product_images].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)[0];
    next.push({
      ...item,
      productId: p.id,
      name: p.name,
      size: row.size,
      color: row.color,
      price,
      isPreorder,
      maxStock,
      imagePath: cover?.path ?? null,
      quantity,
    });
  }

  if (JSON.stringify(next) !== JSON.stringify(read())) write(next);
  return changes;
}

/**
 * Pone al día la bolsa al montar el componente (bolsa y checkout).
 * `done` es true cuando terminó (aunque haya fallado: el servidor valida igual).
 * `resync` la vuelve a revisar, por ejemplo si `place_order` rechazó el pedido.
 */
export function useCartSync() {
  const [state, setState] = useState<{ done: boolean; changes: string[] }>({ done: false, changes: [] });

  const resync = useCallback(
    () =>
      syncCart(getSupabase())
        .then((changes) => {
          setState({ done: true, changes });
          return changes;
        })
        .catch(() => {
          setState((s) => ({ ...s, done: true }));
          return [] as string[];
        }),
    []
  );

  useEffect(() => {
    resync();
  }, [resync]);

  return { ...state, resync };
}

/** Estado de la bolsa. En el servidor (y antes de hidratar) siempre está vacío. */
export function useCart() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const preorderSubtotal = items.filter((i) => i.isPreorder).reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  return { items, subtotal, preorderSubtotal, count, ...cartActions };
}
