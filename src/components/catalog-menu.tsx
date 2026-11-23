"use client";

import { ChevronRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { fetchCategories } from "@/lib/queries";
import { getSupabase } from "@/lib/supabase/browser";
import type { Category } from "@/lib/types";

import { cn } from "./ui";

// Las categorías se piden una sola vez, al abrir el menú por primera vez.
let cached: Category[] | null = null;

const QUICK_LINKS = [
  { href: "/", label: "Ver todo" },
  { href: "/?nuevo=1", label: "Lo nuevo" },
  { href: "/?modo=stock", label: "Entrega inmediata" },
  { href: "/?modo=pedido", label: "Sobre pedido" },
];

/** Botón ☰ del encabezado (celular) que despliega el catálogo bajo el encabezado. */
export function CatalogMenu() {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[] | null>(cached);
  const [error, setError] = useState(false);
  const panelId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !cached) {
      fetchCategories(getSupabase())
        .then((c) => {
          cached = c;
          setCategories(c);
          setError(false);
        })
        .catch(() => setError(true));
    }
  }

  function close(returnFocus = false) {
    setOpen(false);
    if (returnFocus) trigger.current?.focus();
  }

  // Mientras está abierto: Esc cierra, el fondo no se desplaza y el foco entra al panel
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Cerrar catálogo" : "Abrir catálogo"}
        className="flex size-11 items-center justify-center rounded-full text-ink hover:bg-surface md:hidden">
        {open ? <X className="size-6" /> : <Menu className="size-6" />}
      </button>

      {open && (
        <>
          {/* Fondo: tocar fuera cierra */}
          <div aria-hidden className="fixed inset-0 top-[var(--header-h)] z-30 bg-ink/30 md:hidden" onClick={() => close()} />
          <div
            ref={panel}
            id={panelId}
            role="dialog"
            aria-label="Catálogo"
            className="absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-var(--header-h)-4rem)] overflow-y-auto border-b border-line bg-white shadow-lg md:hidden">
            <nav aria-label="Catálogo" className="mx-auto flex max-w-6xl flex-col px-4 pt-2 pb-5">
              <ul>
                {QUICK_LINKS.map((l) => (
                  <li key={l.href}>
                    <MenuLink href={l.href} onSelect={() => close()} strong={l.href === "/"}>
                      {l.label}
                    </MenuLink>
                  </li>
                ))}
              </ul>

              <h2 className="mt-4 mb-1 text-sm font-semibold text-muted">Categorías</h2>
              {error ? (
                <p className="py-3 text-sm text-muted">No pudimos cargar las categorías. Revisa tu conexión.</p>
              ) : !categories ? (
                <p className="py-3 text-sm text-muted">Cargando…</p>
              ) : categories.length === 0 ? (
                <p className="py-3 text-sm text-muted">Todavía no hay categorías.</p>
              ) : (
                <ul>
                  {categories.map((c) => (
                    <li key={c.id}>
                      <MenuLink href={`/?cat=${c.id}`} onSelect={() => close()}>
                        {c.name}
                      </MenuLink>
                    </li>
                  ))}
                </ul>
              )}
            </nav>
          </div>
        </>
      )}
    </>
  );
}

function MenuLink({
  href,
  onSelect,
  strong,
  children,
}: {
  href: string;
  onSelect: () => void;
  strong?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className={cn(
        "flex min-h-12 items-center justify-between border-b border-line text-base",
        strong ? "font-semibold" : "font-medium"
      )}>
      {children}
      <ChevronRight className="size-5 text-muted" aria-hidden />
    </Link>
  );
}
