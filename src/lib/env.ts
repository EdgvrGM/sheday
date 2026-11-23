// Las variables NEXT_PUBLIC_* se incrustan en el código al compilar.
// En Cloudflare deben configurarse como variables de *build*.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
// Dominio de producción por defecto; en local, .env.local lo cambia a http://localhost:3000.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://sheday.mx").replace(/\/$/, "");

export function assertEnv() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copia .env.example a .env.local y llénalo."
    );
  }
}
