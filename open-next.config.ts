import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Sin caché incremental (R2): todas las páginas se renderizan al momento,
// así lo que cambies en el admin se ve de inmediato en la tienda.
export default defineCloudflareConfig({});
