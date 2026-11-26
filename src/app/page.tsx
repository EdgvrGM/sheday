import { Search, Shirt } from "lucide-react";
import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { buttonClass, chipClass, EmptyState, ErrorBox } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { arrivalLabel } from "@/lib/format";
import { type CardProduct, catalogOrder, fetchCatalog, fetchCategories, isAvailable, isNew, newSince } from "@/lib/queries";
import { getPublicSupabase } from "@/lib/supabase/public";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";

type Mode = "stock" | "pedido";
interface Filters {
  q?: string;
  modo?: Mode;
  cat?: number;
  nuevo?: boolean;
}

function buildHref({ q, modo, cat, nuevo }: Filters) {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (nuevo) sp.set("nuevo", "1");
  if (modo) sp.set("modo", modo);
  if (cat) sp.set("cat", String(cat));
  const s = sp.toString();
  return s ? `/?${s}` : "/";
}

export default async function CatalogPage(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const modo = sp.modo === "stock" || sp.modo === "pedido" ? (sp.modo as Mode) : undefined;
  const catNum = typeof sp.cat === "string" ? Number(sp.cat) : NaN;
  const cat = Number.isInteger(catNum) && catNum > 0 ? catNum : undefined;
  const nuevo = sp.nuevo === "1";
  const filters: Filters = { q, modo, cat, nuevo };
  const hasFilters = Boolean(q || modo || cat || nuevo);

  let products: CardProduct[] = [];
  let categories: Category[] = [];
  let error: string | null = null;
  try {
    const sb = getPublicSupabase();
    // Los filtros se aplican en la BD: llega solo lo que se va a mostrar
    [products, categories] = await Promise.all([
      fetchCatalog(sb, {
        q,
        mode: modo === "pedido" ? "preorder" : modo === "stock" ? "stock" : undefined,
        categoryId: cat,
        since: nuevo ? newSince() : undefined,
      }),
      fetchCategories(sb),
    ]);
  } catch (e) {
    error = errorMessage(e);
  }

  // "Lo que llegó": piezas disponibles subidas en los últimos días (la banda solo sale sin filtros,
  // y entonces `products` es el catálogo completo, ordenado del más reciente al más viejo)
  const fresh = hasFilters ? [] : products.filter((p) => isNew(p) && isAvailable(p));
  const latest = fresh[0];

  // Nuevo primero, luego lo que tiene más tallas (con categorías intercaladas) y lo agotado al final
  const filtered = catalogOrder(products.filter((p) => !nuevo || isAvailable(p)));

  return (
    <div className="flex flex-col gap-5">
      {error && <ErrorBox message={error} />}

      {latest && !hasFilters && (
        <section
          aria-labelledby="llegada"
          className="signature-glow -mx-4 -mt-4 flex flex-col items-start gap-4 bg-surface px-4 pt-7 pb-6 md:mx-0 md:mt-0 md:flex-row md:items-end md:justify-between md:rounded-xl md:px-10 md:py-10">
          <div className="flex flex-col gap-2">
            <h1 id="llegada" className="font-display text-4xl leading-[1.05] font-semibold text-balance md:text-6xl">
              {arrivalLabel(latest.created_at)}
            </h1>
            {/* El único rosa de la banda: la misma etiqueta "Nuevo" que llevan las tarjetas */}
            <p className="flex items-center gap-2 text-base font-medium text-muted">
              <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-paper">Nuevo</span>
              {fresh.length === 1 ? "1 pieza esta semana" : `${fresh.length} piezas esta semana`}
            </p>
          </div>
          <Link href={buildHref({ nuevo: true })} className={buttonClass("primary")}>
            Ver lo nuevo
          </Link>
        </section>
      )}

      <form id="buscar" action="/" role="search" className="flex scroll-mt-24 items-center gap-2 rounded-full bg-surface px-4">
        <Search className="size-5 shrink-0 text-muted" aria-hidden />
        <input
          name="q"
          maxLength={60}
          type="search"
          defaultValue={q}
          placeholder="Buscar vestidos, blusas…"
          aria-label="Buscar productos"
          className="w-full bg-transparent py-3 outline-none"
        />
        {nuevo && <input type="hidden" name="nuevo" value="1" />}
        {modo && <input type="hidden" name="modo" value={modo} />}
        {cat && <input type="hidden" name="cat" value={cat} />}
      </form>

      <nav aria-label="Filtros" className="flex flex-col gap-2">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <Link href={buildHref({ ...filters, modo: undefined, nuevo: false })} className={chipClass(!modo && !nuevo)}>
            Todo
          </Link>
          <Link href={buildHref({ ...filters, nuevo: !nuevo })} className={chipClass(nuevo)}>
            Lo nuevo
          </Link>
          <Link href={buildHref({ ...filters, modo: modo === "stock" ? undefined : "stock" })} className={chipClass(modo === "stock")}>
            Entrega inmediata
          </Link>
          <Link href={buildHref({ ...filters, modo: modo === "pedido" ? undefined : "pedido" })} className={chipClass(modo === "pedido")}>
            Sobre pedido
          </Link>
        </div>

        {categories.length > 0 && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            <Link href={buildHref({ ...filters, cat: undefined })} className={chipClass(!cat, false, "subtle")}>
              Todas
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={buildHref({ ...filters, cat: cat === c.id ? undefined : c.id })}
                className={chipClass(cat === c.id, false, "subtle")}>
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Shirt}
          title={hasFilters ? "No hay piezas con estos filtros" : "Todavía no hay piezas publicadas"}
          message={hasFilters ? "Quita un filtro o busca otra palabra." : "Vuelve pronto: aquí aparece lo que va llegando."}>
          {hasFilters && (
            <Link href="/" className={chipClass(false)}>
              Ver todo
            </Link>
          )}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">
          {filtered.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 4} />
          ))}
        </div>
      )}
    </div>
  );
}
