import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "../env";

/**
 * Cliente con la llave SECRETA de Supabase (salta RLS).
 * Solo para el servidor. La llave vive en:
 *  - local: SUPABASE_SECRET_KEY en .env.local
 *  - producción: secreto SUPABASE_SECRET_KEY del Worker en Cloudflare
 * Se lee en cada petición (en Cloudflare llega en tiempo de ejecución).
 */
export function getAdminSupabase(): SupabaseClient {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !secret) {
    throw new Error("Falta SUPABASE_SECRET_KEY en el servidor.");
  }
  return createClient(SUPABASE_URL, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
