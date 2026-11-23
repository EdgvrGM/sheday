import { Shirt } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { formatMoney, productHref } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import { isAvailable } from "@/lib/queries";
import type { Product } from "@/lib/types";

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const cover = product.product_images[0]?.path;
  const available = isAvailable(product);

  return (
    <Link href={productHref(product.id, product.name)} className="group flex flex-col gap-2">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface">
        {cover ? (
          <Image
            src={imageUrl(cover)!}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            priority={priority}
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Shirt className="size-10 text-line" />
          </div>
        )}
        {product.mode === "preorder" && (
          <span className="absolute top-2 left-2 rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white">
            Sobre pedido
          </span>
        )}
        {!available && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <span className="rounded-full bg-ink px-3 py-1 text-sm font-bold text-white">Agotado</span>
          </div>
        )}
      </div>
      <div>
        <p className="line-clamp-2 text-sm leading-snug">{product.name}</p>
        <p className="mt-0.5 font-bold text-brand">{formatMoney(product.price)}</p>
      </div>
    </Link>
  );
}
