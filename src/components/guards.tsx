"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "./auth-provider";
import { Spinner } from "./ui";

/**
 * Muestra el contenido solo con sesión iniciada; si no, manda a /login y
 * regresa aquí después. La seguridad real de los datos está en RLS.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, initializing } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!initializing && !session) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [initializing, session, router, pathname]);

  if (initializing || !session) return <Spinner />;
  return <>{children}</>;
}

/** Solo administradoras. Si no lo es, regresa a la tienda. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, isAdmin, initializing } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (initializing) return;
    if (!session) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (!isAdmin) router.replace("/");
  }, [initializing, session, isAdmin, router, pathname]);

  if (initializing || !isAdmin) return <Spinner />;
  return <>{children}</>;
}
