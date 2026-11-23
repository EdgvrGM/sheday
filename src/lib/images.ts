import { supabase } from './supabase';

export const PRODUCT_BUCKET = 'product-images';

export function imageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Sube una foto local (uri de expo-image-picker) y regresa su ruta en el bucket. */
export async function uploadProductImage(
  productId: number,
  uri: string,
  mimeType?: string | null
): Promise<string> {
  const contentType = mimeType ?? 'image/jpeg';
  const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const body = await fetch(uri).then((r) => r.arrayBuffer());
  const { error } = await supabase.storage
    .from(PRODUCT_BUCKET)
    .upload(path, body, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

export async function deleteProductImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(PRODUCT_BUCKET).remove(paths);
  if (error) throw error;
}
