import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/checkout", "/bolsa", "/carrito", "/cuenta", "/pedidos", "/login", "/registro", "/recuperar", "/restablecer"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
