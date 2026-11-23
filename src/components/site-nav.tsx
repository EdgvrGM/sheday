"use client";

import { Briefcase, Receipt, ShoppingBag, Store, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCart } from "@/lib/cart";

import { useAuth } from "./auth-provider";
import { cn } from "./ui";

function useNavItems() {
  const { isAdmin } = useAuth();
  const items = [
    { href: "/", label: "Tienda", icon: Store },
    { href: "/carrito", label: "Carrito", icon: ShoppingBag },
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
    <span className="absolute -top-1.5 -right-2 flex min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** Encabezado: logo y, en pantallas medianas o grandes, la navegación completa. */
export function SiteHeader() {
  const pathname = usePathname();
  const items = useNavItems();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-2xl font-extrabold tracking-tight text-brand">
          Sheday
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
                {href === "/carrito" && <CartBadge />}
              </span>
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/carrito" aria-label="Carrito" className="relative p-2 md:hidden">
          <ShoppingBag className="size-6" />
          <CartBadge />
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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="flex">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-brand" : "text-muted")}>
              <span className="relative">
                <Icon className="size-6" strokeWidth={active ? 2.4 : 1.8} />
                {href === "/carrito" && <CartBadge />}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
