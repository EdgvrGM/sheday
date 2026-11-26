"use client";

import { Shirt } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

import { imagesForColor } from "@/lib/images";
import type { ProductVariant } from "@/lib/types";

import { resolveSelection, useProductSelection } from "./product-selection";
import { cn } from "./ui";

type GalleryImage = { src: string; thumb: string; color?: string | null };

/**
 * Galería del producto: si sus fotos tienen color (0008), muestra las del color
 * elegido más las de todos los colores.
 */
export function ProductGallery({
  images,
  variants,
  alt,
}: {
  images: GalleryImage[];
  variants: Pick<ProductVariant, "size" | "color">[];
  alt: string;
}) {
  const { size, color } = useProductSelection();
  const { effectiveColor } = resolveSelection(variants, size, color);
  const shown = imagesForColor(images, effectiveColor);
  // La key reinicia el carrusel (vuelve a la primera foto) al cambiar de color
  return <Carousel key={shown.map((i) => i.src).join("|")} images={shown} alt={alt} />;
}

/** Carrusel deslizable en celular; miniaturas en escritorio. */
function Carousel({ images, alt }: { images: GalleryImage[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center rounded-xl bg-surface">
        <Shirt className="size-16 text-line" />
      </div>
    );
  }

  function goTo(i: number) {
    const el = scroller.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="flex flex-col gap-3 md:sticky md:top-20 md:self-start">
      <div className="relative -mx-4 md:mx-0">
        <div
          ref={scroller}
          onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto md:rounded-xl">
          {images.map(({ src }, i) => (
            <div key={src} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-surface">
              <Image
                src={src}
                alt={`${alt} — foto ${i + 1}`}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                priority={i === 0}
                className="object-cover"
              />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 md:hidden">
            {images.map(({ src }, i) => (
              <span key={src} className={cn("h-1.5 rounded-full bg-white/70 transition-all", i === index ? "w-5 bg-white" : "w-1.5")} />
            ))}
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="hidden gap-2 md:flex">
          {images.map(({ src, thumb }, i) => (
            <button
              key={src}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ver foto ${i + 1}`}
              className={cn(
                "relative aspect-[4/5] w-16 overflow-hidden rounded-lg border-2",
                i === index ? "border-brand" : "border-transparent"
              )}>
              <Image src={thumb} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
