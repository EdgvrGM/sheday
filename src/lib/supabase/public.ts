import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { assertEnv, SUPABASE_KEY, SUPABASE_URL } from "../env";

/**
 * Cliente anónimo para el servidor (catálogo público, SEO, sitemap).
 * No maneja sesión: solo lee lo que RLS permite a cualquier visitante.
 */
export function getPublicSupabase(): SupabaseClient {
  assertEnv();
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
