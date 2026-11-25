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
  // Encabezados de seguridad para todas las páginas
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Nadie puede mostrar la tienda (ni el admin) dentro de un iframe: evita clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // No usamos cámara (las fotos se eligen con el selector de archivos), micrófono ni ubicación
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // Solo HTTPS (los navegadores lo ignoran en http://localhost)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
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
