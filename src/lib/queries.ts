import type { SupabaseClient } from "@supabase/supabase-js";

import type { Category, Order, Product, StoreSettings } from "./types";

// Las funciones reciben el cliente: el servidor usa el público (anónimo)
// y el navegador el que tiene la sesión de la usuaria.

const PRODUCT_SELECT = "*, product_images(*), product_variants(*)";

function sortChildren(p: Product): Product {
  p.product_images.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  p.product_variants.sort((a, b) => a.id - b.id);
  return p;
}

export async function fetchProducts(sb: SupabaseClient, opts: { includeInactive?: boolean } = {}): Promise<Product[]> {
  let q = sb.from("products").select(PRODUCT_SELECT).order("created_at", { ascending: false });
  if (!opts.includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data as Product[]).map(sortChildren);
}

export async function fetchProduct(sb: SupabaseClient, id: number): Promise<Product | null> {
  const { data, error } = await sb.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? sortChildren(data as Product) : null;
}

export async function fetchCategories(sb: SupabaseClient): Promise<Category[]> {
  const { data, error } = await sb.from("categories").select("*").order("sort_order").order("name");
  if (error) throw error;
  return data as Category[];
}

export async function fetchSettings(sb: SupabaseClient): Promise<StoreSettings> {
  const { data, error } = await sb
    .from("store_settings")
    .select("whatsapp_number, deposit_percent, delivery_notes")
    .single();
  if (error) throw error;
  return data as StoreSettings;
}

export async function fetchOrders(sb: SupabaseClient, opts: { userId?: string } = {}): Promise<Order[]> {
  let q = sb.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
  if (opts.userId) q = q.eq("user_id", opts.userId);
  const { data, error } = await q;
  if (error) throw error;
  return data as Order[];
}

export async function fetchOrder(sb: SupabaseClient, id: number): Promise<Order | null> {
  const { data, error } = await sb.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Order | null;
}

export function totalStock(p: Product): number {
  return p.product_variants.reduce((sum, v) => sum + v.stock, 0);
}

export function isAvailable(p: Product): boolean {
  return p.mode === "preorder" ? p.product_variants.length > 0 : totalStock(p) > 0;
}
