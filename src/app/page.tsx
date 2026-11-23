import { Search, Shirt } from "lucide-react";
import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { chipClass, EmptyState, ErrorBox } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { fetchCategories, fetchProducts, isAvailable } from "@/lib/queries";
import { getPublicSupabase } from "@/lib/supabase/public";
import type { Category, Product } from "@/lib/types";

export const dynamic = "force-dynamic";

type Mode = "stock" | "pedido";

function buildHref(params: { q?: string; modo?: Mode; cat?: number }) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.modo) sp.set("modo", params.modo);
  if (params.cat) sp.set("cat", String(params.cat));
  const s = sp.toString();
  return s ? `/?${s}` : "/";
}

export default async function CatalogPage(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const modo = sp.modo === "stock" || sp.modo === "pedido" ? (sp.modo as Mode) : undefined;
  const cat = typeof sp.cat === "string" ? Number(sp.cat) || undefined : undefined;

  let products: Product[] = [];
  let categories: Category[] = [];
  let error: string | null = null;
  try {
    const sb = getPublicSupabase();
    [products, categories] = await Promise.all([fetchProducts(sb), fetchCategories(sb)]);
  } catch (e) {
    error = errorMessage(e);
  }

  const needle = q.toLowerCase();
  const filtered = products
    .filter((p) => !modo || p.mode === (modo === "pedido" ? "preorder" : "stock"))
    .filter((p) => !cat || p.category_id === cat)
    .filter((p) => !needle || p.name.toLowerCase().includes(needle) || p.description.toLowerCase().includes(needle))
    .sort((a, b) => Number(isAvailable(b)) - Number(isAvailable(a)));

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorBox message={error} />}

      <form action="/" className="flex items-center gap-2 rounded-full bg-surface px-4">
        <Search className="size-5 shrink-0 text-muted" />
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar vestidos, blusas…"
          aria-label="Buscar productos"
          className="w-full bg-transparent py-3 outline-none"
        />
        {modo && <input type="hidden" name="modo" value={modo} />}
        {cat && <input type="hidden" name="cat" value={cat} />}
      </form>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <Link href={buildHref({ q, cat })} className={chipClass(!modo)}>
          Todo
        </Link>
        <Link href={buildHref({ q, cat, modo: "stock" })} className={chipClass(modo === "stock")}>
          Entrega inmediata
        </Link>
        <Link href={buildHref({ q, cat, modo: "pedido" })} className={chipClass(modo === "pedido")}>
          Sobre pedido
        </Link>
      </div>

      {categories.length > 0 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <Link href={buildHref({ q, modo })} className={chipClass(!cat)}>
            Todas
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={buildHref({ q, modo, cat: cat === c.id ? undefined : c.id })} className={chipClass(cat === c.id)}>
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Shirt}
          title="No encontramos productos"
          message={q || modo || cat ? "Prueba con otros filtros." : "Pronto subiremos novedades."}
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 4} />
          ))}
        </div>
      )}
    </div>
  );
}
