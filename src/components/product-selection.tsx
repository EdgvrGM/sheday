"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import type { ProductVariant } from "@/lib/types";

// Talla y color que eligió la clienta en la página del producto. Lo comparten la
// compra (los chips) y la galería (muestra las fotos del color elegido, 0008).

interface Selection {
  size: string | null;
  color: string | null;
  setSize: (size: string | null) => void;
  setColor: (color: string | null) => void;
}

const SelectionContext = createContext<Selection>({ size: null, color: null, setSize: () => {}, setColor: () => {} });

export function ProductSelectionProvider({ children }: { children: ReactNode }) {
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  return <SelectionContext.Provider value={{ size, color, setSize, setColor }}>{children}</SelectionContext.Provider>;
}

export function useProductSelection() {
  return useContext(SelectionContext);
}

/** Talla y color efectivos: si solo hay una opción, se elige sola. */
export function resolveSelection(variants: Pick<ProductVariant, "size" | "color">[], size: string | null, color: string | null) {
  const sizes = [...new Set(variants.map((v) => v.size))];
  const effectiveSize = size ?? (sizes.length === 1 ? sizes[0] : null);
  const colors = [
    ...new Set(variants.filter((v) => !effectiveSize || v.size === effectiveSize).map((v) => v.color).filter(Boolean)),
  ];
  const effectiveColor = color ?? (colors.length <= 1 ? (colors[0] ?? "") : null);
  return { sizes, effectiveSize, colors, effectiveColor };
}
