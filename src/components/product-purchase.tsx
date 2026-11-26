"use client";

import { MessageCircle, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { cartActions } from "@/lib/cart";
import { thumbOrFull } from "@/lib/images";
import { parseGuide } from "@/lib/size-guides";
import { productQuestionMessage, whatsappLink } from "@/lib/whatsapp";
import type { Product } from "@/lib/types";

import { SizeGuide } from "./size-guide";
import { useToast } from "./toast";
import { Button, ButtonLink, Chip, QuantityStepper } from "./ui";

export function ProductPurchase({
  product,
  whatsappNumber,
  url,
}: {
  product: Product;
  whatsappNumber: string;
  url: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const isPreorder = product.mode === "preorder";
  const variants = product.product_variants;
  const sizes = [...new Set(variants.map((v) => v.size))];
  // Guía de tallas propia del producto (se escribe en su ficha del admin)
  const guide = parseGuide(product.size_guide);
  const effectiveSize = size ?? (sizes.length === 1 ? sizes[0] : null);
  const colors = [
    ...new Set(variants.filter((v) => !effectiveSize || v.size === effectiveSize).map((v) => v.color).filter(Boolean)),
  ];
  // Si solo hay una opción, se elige sola
  const effectiveColor = color ?? (colors.length <= 1 ? (colors[0] ?? "") : null);
  const variant = variants.find((v) => v.size === effectiveSize && effectiveColor != null && v.color === effectiveColor);

  const stockForSize = (s: string) => variants.filter((v) => v.size === s).reduce((n, v) => n + v.stock, 0);
  const stockForColor = (c: string) =>
    variants.filter((v) => v.color === c && (!effectiveSize || v.size === effectiveSize)).reduce((n, v) => n + v.stock, 0);

  const maxQty = isPreorder ? 99 : (variant?.stock ?? 0);
  const canAdd = !!variant && (isPreorder || variant.stock > 0);
  const waLink = whatsappLink(whatsappNumber, productQuestionMessage(product.name, url));

  function add(goToCart: boolean) {
    if (!variant) return;
    cartActions.add({
      variantId: variant.id,
      productId: product.id,
      name: product.name,
      size: variant.size,
      color: variant.color,
      price: Number(product.price),
      imagePath: thumbOrFull(product.product_images[0]),
      isPreorder,
      quantity: Math.min(qty, Math.max(1, maxQty)),
      maxStock: isPreorder ? null : variant.stock,
    });
    if (goToCart) router.push("/bolsa");
    else toast("Agregado a tu bolsa");
  }

  return (
    <div className="flex flex-col gap-5">
      {sizes.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Talla</span>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <Chip
                key={s}
                selected={effectiveSize === s}
                disabled={!isPreorder && stockForSize(s) === 0}
                onClick={() => {
                  setSize(s);
                  setColor(null);
                  setQty(1);
                }}>
                {s}
              </Chip>
            ))}
          </div>
          {guide && <SizeGuide guide={guide} selectedSize={effectiveSize} />}
        </div>
      )}

      {colors.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Color</span>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <Chip
                key={c}
                selected={effectiveColor === c}
                disabled={!isPreorder && stockForColor(c) === 0}
                onClick={() => {
                  setColor(c);
                  setQty(1);
                }}>
                {c}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {variant && !isPreorder && (
        <p className={variant.stock > 0 && variant.stock <= 2 ? "text-sm font-semibold text-warning" : "text-sm text-muted"}>
          {variant.stock === 0
            ? "Agotado en esta opción"
            : variant.stock <= 2
              ? variant.stock === 1
                ? "¡Solo queda 1!"
                : `¡Solo quedan ${variant.stock}!`
              : `${variant.stock} disponibles`}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Cantidad</span>
        <QuantityStepper value={qty} onChange={setQty} max={Math.max(1, maxQty)} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button icon={ShoppingBag} disabled={!canAdd} onClick={() => add(true)} className="flex-1">
          {!variant ? (colors.length > 1 ? "Elige talla y color" : "Elige tu talla") : canAdd ? "Comprar" : "Agotado"}
        </Button>
        <Button kind="secondary" disabled={!canAdd} onClick={() => add(false)} className="flex-1">
          Agregar a la bolsa
        </Button>
      </div>

      {waLink && (
        <ButtonLink href={waLink} external kind="ghost" icon={MessageCircle}>
          Preguntar por WhatsApp
        </ButtonLink>
      )}
    </div>
  );
}
