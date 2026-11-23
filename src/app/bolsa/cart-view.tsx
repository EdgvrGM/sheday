"use client";

import { ArrowRight, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/components/auth-provider";
import { Thumb } from "@/components/order-parts";
import { Badge, ButtonLink, Card, EmptyState, PageTitle, QuantityStepper } from "@/components/ui";
import { useCart } from "@/lib/cart";
import { formatMoney, productHref } from "@/lib/format";

export function CartView() {
  const cart = useCart();
  const { session } = useAuth();

  if (cart.items.length === 0) {
    return (
      <EmptyState icon={ShoppingBag} title="Tu bolsa está vacía" message="Explora la tienda y agrega lo que te guste.">
        <ButtonLink href="/">Ver la tienda</ButtonLink>
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 md:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-3">
        <PageTitle>Tu bolsa</PageTitle>
        {cart.items.map((item) => (
          <Card key={item.variantId} className="flex-row gap-3">
            <Link href={productHref(item.productId, item.name)}>
              <Thumb path={item.imagePath} className="h-24 w-[72px]" />
            </Link>
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <Link href={productHref(item.productId, item.name)} className="line-clamp-2 text-sm">
                  {item.name}
                </Link>
                <button
                  type="button"
                  aria-label="Quitar de la bolsa"
                  onClick={() => cart.remove(item.variantId)}
                  className="-m-2.5 flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-red-700">
                  <Trash2 className="size-5" />
                </button>
              </div>
              <p className="text-xs text-muted">{[item.size, item.color].filter(Boolean).join(" · ")}</p>
              {item.isPreorder && <Badge className="bg-ink text-white">Sobre pedido</Badge>}
              <div className="mt-auto flex items-center justify-between">
                <span className="font-semibold">{formatMoney(item.price * item.quantity)}</span>
                <QuantityStepper
                  value={item.quantity}
                  max={item.isPreorder || item.maxStock == null ? 99 : item.maxStock}
                  onChange={(q) => cart.setQuantity(item.variantId, q)}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:sticky md:top-20 md:self-start md:pt-12">
        <Card>
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatMoney(cart.subtotal)}</span>
          </div>
          {cart.preorderSubtotal > 0 && (
            <p className="text-xs text-muted">
              Incluye {formatMoney(cart.preorderSubtotal)} en artículos sobre pedido, que requieren anticipo.
            </p>
          )}
          <p className="text-xs text-muted">Pagas en efectivo al recibir. Te contactamos por WhatsApp para coordinar.</p>
        </Card>
        <ButtonLink href={session ? "/checkout" : "/login?next=/checkout"} icon={ArrowRight}>
          {session ? "Continuar" : "Inicia sesión para continuar"}
        </ButtonLink>
      </div>
    </div>
  );
}
