"use client";

import { Briefcase, Receipt, ShoppingBag, Store, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useCart } from "@/lib/cart";

import { useAuth } from "./auth-provider";
import { CatalogMenu } from "./catalog-menu";
import { ThemeMenu } from "./theme-switch";
import { cn } from "./ui";

function useNavItems() {
  const { isAdmin } = useAuth();
  const items = [
    { href: "/", label: "Tienda", icon: Store },
    { href: "/bolsa", label: "Bolsa", icon: ShoppingBag },
    { href: "/pedidos", label: "Pedidos", icon: Receipt },
    { href: "/cuenta", label: "Cuenta", icon: User },
  ];
  if (isAdmin) items.push({ href: "/admin", label: "Admin", icon: Briefcase });
  return items;
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" || pathname.startsWith("/producto") : pathname.startsWith(href);
}

function CartBadge() {
  const { count } = useCart();
  if (count === 0) return null;
  return (
    <span className="absolute -top-1.5 -right-2 flex min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-bold text-paper">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** true cuando la página bajó; con histéresis para que no parpadee en el límite. */
function useCompactOnScroll() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setCompact((prev) => (prev ? y > 8 : y > 48));
    };
    // Estado inicial (por si la página abre ya desplazada, p. ej. al regresar)
    const raf = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return compact;
}

/**
 * Encabezado.
 * - Celular: logo centrado (convención de tiendas de moda), catálogo desplegable a la izquierda, bolsa a la derecha.
 * - Escritorio: logo a la izquierda y navegación completa.
 * - Se compacta al hacer scroll para dejar más espacio a las fotos.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const items = useNavItems();
  const compact = useCompactOnScroll();
  return (
    <header
      className="glass-bar sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur"
      // Altura actual del encabezado en celular: la usa el menú de catálogo
      style={{ "--header-h": compact ? "57px" : "65px" } as React.CSSProperties}>
      <div
        className={cn(
          "relative mx-auto flex max-w-6xl items-center justify-between px-2 transition-[height] duration-200 ease-out md:px-4",
          compact ? "h-14 md:h-16" : "h-16 md:h-20"
        )}>
        <CatalogMenu />
        {/* Logo: etiqueta S+D + SHEDAY (design/logo/8-etiqueta-sd). Proporción 721×187 */}
        <Link
          href="/"
          aria-label="Sheday, inicio"
          className="absolute left-1/2 flex -translate-x-1/2 items-center rounded-md md:static md:translate-x-0">
          {/* Una versión por tema: en oscuro el nombre va en blanco hueso (la etiqueta rosa no cambia) */}
          {(["light", "dark"] as const).map((t) => (
            <Image
              key={t}
              src={t === "light" ? "/brand/sheday-horizontal.svg" : "/brand/sheday-horizontal-oscuro.svg"}
              alt="Sheday"
              width={200}
              height={52}
              priority
              className={cn(
                "w-auto transition-[height] duration-200 ease-out",
                t === "light" ? "dark:hidden" : "hidden dark:block",
                compact ? "h-9 md:h-10" : "h-12 md:h-[52px]"
              )}
            />
          ))}
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                isActive(pathname, href) ? "bg-brand-soft text-brand" : "text-ink hover:bg-surface"
              )}>
              <span className="relative">
                <Icon className="size-5" />
                {href === "/bolsa" && <CartBadge />}
              </span>
              {label}
            </Link>
          ))}
          <ThemeMenu />
        </nav>
        <Link
          href="/bolsa"
          aria-label="Tu bolsa"
          className="relative flex size-11 items-center justify-center rounded-full text-ink hover:bg-surface md:hidden">
          <span className="relative">
            <ShoppingBag className="size-6" />
            <CartBadge />
          </span>
        </Link>
      </div>
    </header>
  );
}

/** Barra inferior tipo app, solo en celular. */
export function BottomNav() {
  const pathname = usePathname();
  const items = useNavItems();
  return (
    <nav className="glass-bar fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="flex">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium", active ? "text-brand" : "text-muted")}>
              <span className="relative">
                <Icon className="size-6" strokeWidth={active ? 2.4 : 1.8} />
                {href === "/bolsa" && <CartBadge />}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
