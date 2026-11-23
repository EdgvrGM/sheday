import type { SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "./env";

export const PRODUCT_BUCKET = "product-images";

/** URL pública de una foto del bucket (funciona en servidor y navegador). */
export function imageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return `${SUPABASE_URL}/storage/v1/object/public/${PRODUCT_BUCKET}/${path}`;
}

/**
 * Reduce la foto a máx. `maxSize` px por lado y la convierte a WebP.
 * Una foto de celular de ~4 MB queda en ~150 KB: carga rápido con datos móviles.
 */
export async function compressImage(file: File, maxSize = 1200, quality = 0.82): Promise<Blob> {
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

/** Comprime y sube una foto; regresa su ruta en el bucket. */
export async function uploadProductImage(
  supabase: SupabaseClient,
  productId: number,
  file: File
): Promise<string> {
  const blob = await compressImage(file);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(PRODUCT_BUCKET)
    .upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
  if (error) throw error;
  return path;
}

export async function deleteProductImages(supabase: SupabaseClient, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(PRODUCT_BUCKET).remove(paths);
  if (error) throw error;
}
