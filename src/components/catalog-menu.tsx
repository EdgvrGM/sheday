"use client";

import { ChevronRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { fetchCategories } from "@/lib/queries";
import { getSupabase } from "@/lib/supabase/browser";
import type { Category } from "@/lib/types";

import { ThemeSwitch } from "./theme-switch";
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
  const pathname = usePathname();
  // Se guarda la página donde se abrió: al cambiar de página queda cerrado solo
  // (si no, el bloqueo de scroll del fondo seguía activo en la página nueva).
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const [categories, setCategories] = useState<Category[] | null>(cached);
  const [error, setError] = useState(false);
  const panelId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  function toggle() {
    const next = !open;
    setOpenAt(next ? pathname : null);
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
    setOpenAt(null);
    if (returnFocus) trigger.current?.focus();
  }

  // Mientras está abierto: Esc cierra, el fondo no se desplaza y el foco entra al panel
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenAt(null);
        trigger.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    // En escritorio el panel se oculta (md:hidden): al ensanchar la ventana se cierra,
    // para no dejar la página sin scroll detrás de un menú invisible
    const desktop = window.matchMedia("(min-width: 48rem)");
    const onDesktop = () => {
      if (desktop.matches) setOpenAt(null);
    };
    desktop.addEventListener("change", onDesktop);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onDesktop);
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
          <div aria-hidden className="fixed inset-0 top-[var(--header-h)] z-30 bg-scrim md:hidden" onClick={() => close()} />
          <div
            ref={panel}
            id={panelId}
            role="dialog"
            aria-label="Catálogo"
            className="absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-var(--header-h)-4rem)] overflow-y-auto border-b border-line bg-overlay shadow-lg panel-lift md:hidden">
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

              <ThemeSwitch className="mt-6" />
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
