/** Solo permite redirigir a rutas internas (evita redirecciones abiertas). */
export function safeNext(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

/**
 * `?next=` de la URL actual, validado. Solo en el navegador (efectos o eventos):
 * así /login y /registro pueden ser páginas estáticas sin leer searchParams al renderizar.
 */
export function nextFromLocation(fallback = "/"): string {
  return safeNext(new URLSearchParams(window.location.search).get("next"), fallback);
}
