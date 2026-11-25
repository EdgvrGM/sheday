import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/env";
import { productHref } from "@/lib/format";
import { fetchSitemapProducts } from "@/lib/queries";
import { getPublicSupabase } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await fetchSitemapProducts(getPublicSupabase()).catch(() => []);
  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    ...products.map((p) => ({
      url: `${SITE_URL}${productHref(p.id, p.name)}`,
      lastModified: new Date(p.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
