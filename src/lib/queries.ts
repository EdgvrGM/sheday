import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Category,
  Order,
  OrderStatus,
  Product,
  ProductImage,
  ProductMode,
  ProductVariant,
  StoreSettings,
} from "./types";

// Las funciones reciben el cliente: el servidor usa el público (anónimo)
// y el navegador el que tiene la sesión de la usuaria.

const PRODUCT_SELECT = "*, product_images(*), product_variants(*)";

function sortChildren(p: Product): Product {
  p.product_images.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  p.product_variants.sort((a, b) => a.id - b.id);
  return p;
}

/** Lo que necesita una tarjeta del catálogo (sin descripción y solo la portada). */
export type CardProduct = Pick<Product, "id" | "name" | "price" | "mode" | "category_id" | "created_at"> & {
  product_images: ProductImage[];
  product_variants: Pick<ProductVariant, "id" | "size" | "stock">[];
};

export interface CatalogFilters {
  /** Busca en nombre y descripción. */
  q?: string;
  mode?: ProductMode;
  categoryId?: number;
  /** Solo productos creados desde esta fecha (ISO). */
  since?: string;
}

/** Quita lo que rompería el filtro `or` de PostgREST o funcionaría como comodín. */
function searchTerm(q: string | undefined): string {
  return (q ?? "").replace(/[,()*%_\\"':]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

/**
 * Catálogo público. Filtra en la BD y trae solo lo que pinta la tarjeta:
 * cada visita cuesta CPU del Worker (10 ms en el plan gratis).
 */
export async function fetchCatalog(sb: SupabaseClient, f: CatalogFilters = {}): Promise<CardProduct[]> {
  let q = sb
    .from("products")
    .select("id, name, price, mode, category_id, created_at, product_images(*), product_variants(id, size, stock)")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .order("sort_order", { referencedTable: "product_images" })
    .order("id", { referencedTable: "product_images" })
    .limit(1, { referencedTable: "product_images" })
    .order("id", { referencedTable: "product_variants" });
  if (f.mode) q = q.eq("mode", f.mode);
  if (f.categoryId) q = q.eq("category_id", f.categoryId);
  if (f.since) q = q.gte("created_at", f.since);
  const term = searchTerm(f.q);
  if (term) q = q.or(`name.ilike.*${term}*,description.ilike.*${term}*`);
  const { data, error } = await q;
  if (error) throw error;
  return data as CardProduct[];
}

/** Lo mínimo para el sitemap. */
export async function fetchSitemapProducts(
  sb: SupabaseClient
): Promise<Pick<Product, "id" | "name" | "created_at">[]> {
  const { data, error } = await sb.from("products").select("id, name, created_at").eq("is_active", true);
  if (error) throw error;
  return data as Pick<Product, "id" | "name" | "created_at">[];
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

/** Pedidos por página en el admin. */
export const ORDERS_PAGE = 20;

/**
 * Una página de pedidos (más recientes primero), filtrada en la BD.
 * `total` es cuántos hay con ese filtro, para "Cargar más".
 */
export async function fetchOrdersPage(
  sb: SupabaseClient,
  opts: { statuses?: OrderStatus[]; offset?: number; limit?: number } = {}
): Promise<{ orders: Order[]; total: number }> {
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? ORDERS_PAGE;
  let q = sb
    .from("orders")
    .select("*, order_items(*)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (opts.statuses) q = q.in("status", opts.statuses);
  const { data, error, count } = await q;
  if (error) throw error;
  return { orders: data as Order[], total: count ?? 0 };
}

/** Cuántos pedidos hay en un estado (sin traerlos). */
export async function countOrders(sb: SupabaseClient, status: OrderStatus): Promise<number> {
  const { count, error } = await sb.from("orders").select("id", { count: "exact", head: true }).eq("status", status);
  if (error) throw error;
  return count ?? 0;
}

/** Lo que pinta la lista de productos del admin (sin descripción y solo la portada). */
export type AdminProduct = Pick<Product, "id" | "name" | "price" | "mode" | "is_active" | "created_at"> & {
  product_images: ProductImage[];
  product_variants: Pick<ProductVariant, "stock">[];
};

export async function fetchAdminProducts(sb: SupabaseClient): Promise<AdminProduct[]> {
  const { data, error } = await sb
    .from("products")
    .select("id, name, price, mode, is_active, created_at, product_images(*), product_variants(stock)")
    .order("created_at", { ascending: false })
    .order("sort_order", { referencedTable: "product_images" })
    .order("id", { referencedTable: "product_images" })
    .limit(1, { referencedTable: "product_images" });
  if (error) throw error;
  return data as AdminProduct[];
}

export async function fetchOrder(sb: SupabaseClient, id: number): Promise<Order | null> {
  const { data, error } = await sb.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Order | null;
}

/** Lo que necesitan las funciones de disponibilidad (sirve para Product y CardProduct). */
type StockInfo = { mode: ProductMode; product_variants: { size: string; stock: number }[] };

export function totalStock(p: { product_variants: { stock: number }[] }): number {
  return p.product_variants.reduce((sum, v) => sum + v.stock, 0);
}

/** Días que un producto se considera "Nuevo". */
export const NEW_DAYS = 7;
const NEW_MS = NEW_DAYS * 24 * 60 * 60 * 1000;

export function isNew(p: { created_at: string }, now = Date.now()): boolean {
  return now - new Date(p.created_at).getTime() < NEW_MS;
}

/** Fecha desde la que un producto cuenta como "Nuevo" (para filtrar en la BD). */
export function newSince(now = Date.now()): string {
  return new Date(now - NEW_MS).toISOString();
}

/** Tallas que se pueden pedir ahora (en stock: solo las que tienen piezas). */
export function availableSizes(p: StockInfo): string[] {
  const sizes = p.product_variants.filter((v) => p.mode === "preorder" || v.stock > 0).map((v) => v.size);
  return [...new Set(sizes)];
}

export function isAvailable(p: StockInfo): boolean {
  return p.mode === "preorder" ? p.product_variants.length > 0 : totalStock(p) > 0;
}
