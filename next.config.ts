import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Las fotos ya se comprimen al subirlas (WebP, máx. 1200 px) y se sirven
  // desde Supabase Storage. Así evitamos el servicio de imágenes de
  // Cloudflare, que es de pago.
  images: { unoptimized: true },
  // La "bolsa" antes se llamaba "carrito": los enlaces viejos siguen funcionando
  async redirects() {
    return [{ source: "/carrito", destination: "/bolsa", permanent: true }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

// Permite usar bindings de Cloudflare durante `next dev`.
initOpenNextCloudflareForDev();
