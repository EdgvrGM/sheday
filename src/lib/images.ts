import type { SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "./env";

export const PRODUCT_BUCKET = "product-images";

/** Lado mayor de la miniatura que usan las tarjetas, la bolsa y el admin. */
export const THUMB_SIZE = 480;

/** URL pública de una foto del bucket (funciona en servidor y navegador). */
export function imageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return `${SUPABASE_URL}/storage/v1/object/public/${PRODUCT_BUCKET}/${path}`;
}

// ---------- Fotos por color (0008) ----------

type Colored = { color?: string | null };

/** ¿Misma etiqueta de color? (sin importar mayúsculas ni espacios) */
export function sameColor(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Fotos que se ven con un color: las suyas más las de todos los colores (sin etiqueta).
 * Sin color elegido, las del primer color etiquetado. Si nada está etiquetado, o el
 * color no tiene fotos propias, todas (así un producto sin etiquetas se ve como antes).
 */
export function imagesForColor<T extends Colored>(images: T[], color: string | null | undefined): T[] {
  const tagged = images.filter((i) => i.color);
  if (tagged.length === 0) return images;
  const target = color ? (tagged.some((i) => sameColor(i.color, color)) ? color : null) : tagged[0].color;
  if (!target) return images;
  return images.filter((i) => !i.color || sameColor(i.color, target));
}

/** Foto que representa a un color (bolsa y pedido): la primera de ese color o la portada. */
export function imageForColor<T extends Colored>(images: T[], color: string | null | undefined): T | undefined {
  return images.find((i) => sameColor(i.color, color)) ?? images[0];
}

/** Miniatura si existe; si no (fotos de antes de 0005), la foto completa. */
export function thumbOrFull(img: { path: string; thumb_path?: string | null } | null | undefined): string | null {
  return img ? img.thumb_path || img.path : null;
}

/**
 * Reduce la foto a máx. `maxSize` px por lado y la convierte a WebP.
 * Una foto de celular de ~4 MB queda en ~150 KB: carga rápido con datos móviles.
 */
export async function compressImage(file: Blob, maxSize = 1200, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (blob && blob.type === "image/webp") return blob;
  // Safari viejo no exporta WebP: usar JPEG
  const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!jpeg) throw new Error("No se pudo comprimir la imagen");
  return jpeg;
}

const extension = (blob: Blob) => (blob.type === "image/webp" ? "webp" : "jpg");

async function uploadBlob(supabase: SupabaseClient, path: string, blob: Blob, upsert = false) {
  const { error } = await supabase.storage
    .from(PRODUCT_BUCKET)
    .upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert });
  if (error) throw error;
}

/**
 * Comprime y sube una foto con su miniatura.
 * `folder`: el id del producto, o "nuevos" si todavía no existe (se crea al guardar).
 * Regresa sus rutas en el bucket: `path` (1200 px) y `thumb` (480 px).
 */
export async function uploadProductImage(
  supabase: SupabaseClient,
  folder: number | string,
  file: File
): Promise<{ path: string; thumb: string }> {
  const [full, small] = await Promise.all([compressImage(file), compressImage(file, THUMB_SIZE, 0.78)]);
  const base = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${base}.${extension(full)}`;
  const thumb = `${base}-${THUMB_SIZE}.${extension(small)}`;
  await Promise.all([uploadBlob(supabase, path, full), uploadBlob(supabase, thumb, small)]);
  return { path, thumb };
}

/** Genera la miniatura de una foto que ya está en el bucket (fotos subidas antes de las miniaturas). */
export async function createThumbnail(supabase: SupabaseClient, path: string): Promise<string> {
  const res = await fetch(imageUrl(path)!);
  if (!res.ok) throw new Error("No se pudo leer la foto para hacer su miniatura");
  const small = await compressImage(await res.blob(), THUMB_SIZE, 0.78);
  const thumb = `${path.replace(/\.[a-z0-9]+$/i, "")}-${THUMB_SIZE}.${extension(small)}`;
  await uploadBlob(supabase, thumb, small, true);
  return thumb;
}

/**
 * Borra fotos del bucket, salvo las que todavía usa algún pedido
 * (`order_items.image_path` guarda la portada al momento de comprar).
 * Si no se puede comprobar, no borra nada: mejor un archivo de más que un pedido sin foto.
 */
export async function deleteUnusedProductImages(supabase: SupabaseClient, paths: (string | null | undefined)[]): Promise<void> {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  if (unique.length === 0) return;
  const { data, error } = await supabase.from("order_items").select("image_path").in("image_path", unique);
  if (error) throw error;
  const used = new Set((data as { image_path: string | null }[]).map((r) => r.image_path));
  const unused = unique.filter((p) => !used.has(p));
  if (unused.length === 0) return;
  const { error: removeError } = await supabase.storage.from(PRODUCT_BUCKET).remove(unused);
  if (removeError) throw removeError;
}
