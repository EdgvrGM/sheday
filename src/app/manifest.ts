import type { MetadataRoute } from "next";

// Permite "Agregar a pantalla de inicio": se abre como app, sin barra del navegador.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sheday — Ropa para mujer",
    short_name: "Sheday",
    description: "Ropa para mujer con entrega inmediata y sobre pedido.",
    lang: "es-MX",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#c2185b",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
