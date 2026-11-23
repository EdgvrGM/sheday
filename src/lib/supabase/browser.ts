"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { assertEnv, SUPABASE_KEY, SUPABASE_URL } from "../env";

let client: SupabaseClient | null = null;

/** Cliente de Supabase para el navegador (sesión guardada en cookies). */
export function getSupabase(): SupabaseClient {
  if (!client) {
    assertEnv();
    client = createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return client;
}
