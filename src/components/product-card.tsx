import { Shirt } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { formatMoney, productHref } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import { availableSizes, isAvailable, isNew } from "@/lib/queries";
import type { Product } from "@/lib/types";

const MAX_SIZES = 4;

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const cover = product.product_images[0]?.path;
  const available = isAvailable(product);
  const sizes = availableSizes(product);
  const isNewItem = isNew(product);

  return (
    <Link href={productHref(product.id, product.name)} className="group flex flex-col gap-2 rounded-xl">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-surface">
        {cover ? (
          <Image
            src={imageUrl(cover)!}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            priority={priority}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Shirt className="size-10 text-line" aria-hidden />
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {isNewItem && available && (
            <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-white">Nuevo</span>
          )}
          {product.mode === "preorder" && (
            <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-bold text-white">Sobre pedido</span>
          )}
        </div>
        {!available && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <span className="rounded-full bg-ink px-3 py-1 text-sm font-bold text-white">Agotado</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <p className="line-clamp-2 text-sm leading-snug group-hover:underline group-hover:underline-offset-2">
          {product.name}
        </p>
        <p className="font-semibold">{formatMoney(product.price)}</p>
        {available && sizes.length > 0 && (
          <ul className="flex flex-wrap gap-1" aria-label="Tallas disponibles">
            {sizes.slice(0, MAX_SIZES).map((s) => (
              <li key={s} className="rounded-full border border-line px-2 text-xs leading-5 text-muted">
                {s}
              </li>
            ))}
            {sizes.length > MAX_SIZES && (
              <li className="px-1 text-xs leading-5 text-muted">+{sizes.length - MAX_SIZES}</li>
            )}
          </ul>
        )}
      </div>
    </Link>
  );
}
