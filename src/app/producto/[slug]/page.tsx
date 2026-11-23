import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { ProductGallery } from "@/components/product-gallery";
import { ProductPurchase } from "@/components/product-purchase";
import { Badge } from "@/components/ui";
import { SITE_URL } from "@/lib/env";
import { formatMoney, parseProductId, productHref, productSlug } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import { fetchProduct, fetchSettings, isAvailable } from "@/lib/queries";
import { getPublicSupabase } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const id = parseProductId(slug);
  if (!id) return null;
  const product = await fetchProduct(getPublicSupabase(), id);
  return product?.is_active ? product : null;
}

export async function generateMetadata(props: PageProps<"/producto/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await load(slug).catch(() => null);
  if (!product) return { title: "Producto no disponible" };

  const description = `${formatMoney(product.price)} · ${
    product.mode === "preorder" ? "Sobre pedido" : "Entrega inmediata"
  }${product.description ? ` · ${product.description.slice(0, 140)}` : ""}`;
  const cover = imageUrl(product.product_images[0]?.path);

  return {
    title: product.name,
    description,
    alternates: { canonical: productHref(product.id, product.name) },
    // Vista previa al compartir el enlace por WhatsApp/Facebook
    openGraph: {
      title: `${product.name} — ${formatMoney(product.price)}`,
      description,
      url: productHref(product.id, product.name),
      images: cover ? [{ url: cover, alt: product.name }] : undefined,
    },
  };
}

export default async function ProductPage(props: PageProps<"/producto/[slug]">) {
  const { slug } = await props.params;
  const product = await load(slug);
  if (!product) notFound();

  // Si el nombre cambió, redirige a la URL correcta (evita duplicados en Google)
  const canonical = productSlug(product.id, product.name);
  if (slug !== canonical) permanentRedirect(`/producto/${canonical}`);

  const settings = await fetchSettings(getPublicSupabase()).catch(() => null);
  const isPreorder = product.mode === "preorder";
  const url = `${SITE_URL}${productHref(product.id, product.name)}`;

  // Datos estructurados para Google (precio y disponibilidad)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: product.product_images.map((i) => imageUrl(i.path)),
    offers: {
      "@type": "Offer",
      priceCurrency: "MXN",
      price: Number(product.price).toFixed(2),
      availability: isAvailable(product)
        ? isPreorder
          ? "https://schema.org/PreOrder"
          : "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url,
    },
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 md:gap-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ProductGallery images={product.product_images.map((i) => imageUrl(i.path)!)} alt={product.name} />

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          {isPreorder ? (
            <Badge className="bg-blue-50 text-blue-700">Sobre pedido</Badge>
          ) : (
            <Badge className="bg-green-50 text-green-700">Entrega inmediata</Badge>
          )}
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{product.name}</h1>
          <p className="text-2xl font-bold text-brand">{formatMoney(product.price)}</p>
        </div>

        {isPreorder && (
          <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
            Lo pedimos especialmente para ti
            {product.preorder_days ? `; llega en aproximadamente ${product.preorder_days} días` : ""}. Se pide un
            anticipo al confirmar.
          </p>
        )}

        <ProductPurchase product={product} whatsappNumber={settings?.whatsapp_number ?? ""} url={url} />

        {product.description && (
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold">Descripción</h2>
            <p className="whitespace-pre-line text-muted">{product.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
