# Sheday

Tienda en línea para la reventa local de ropa (principalmente de mujer). Las clientas ven el catálogo, arman su carrito y confirman su pedido. El seguimiento es por WhatsApp, y la entrega y el pago son en efectivo. **No hay pasarela de pago.**

- **Webapp optimizada para celular y escritorio**, desplegada en tu dominio. No requiere instalar nada; se puede "Agregar a pantalla de inicio" y se abre como app (PWA).
- **Catálogo con buen SEO**: las páginas de producto se renderizan en el servidor, salen en Google y, al compartirlas por WhatsApp, muestran foto, nombre y precio.
- **Panel de administración** en `/admin`: productos, pedidos, categorías y ajustes.
- **Dos modalidades de producto:**
  - **En stock (entrega inmediata):** el inventario se descuenta al confirmar el pedido.
  - **Sobre pedido:** no descuenta stock y pide un **anticipo** (porcentaje configurable).

---

## Stack

| Capa | Tecnología |
|---|---|
| Web | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, `lucide-react` |
| Backend | Supabase: Postgres, Auth (correo y contraseña), Storage (fotos), RLS |
| Hosting | Cloudflare Workers (plan gratis) con el adaptador `@opennextjs/cloudflare` |

### Cómo está armado
- **Páginas públicas** (`/`, `/producto/...`, `sitemap.xml`): se renderizan en el **servidor** con un cliente anónimo de Supabase. Son rápidas, indexables y sin caché: lo que cambies en el admin se ve al instante.
- **Páginas privadas** (carrito, checkout, pedidos, cuenta, admin): corren en el **navegador** con la sesión de la usuaria. La seguridad la dan las políticas **RLS** de Supabase, no la interfaz.
- **Fotos:** se comprimen en el navegador al subirlas (WebP, máximo 1200 px, unos 150 KB) y se sirven desde Supabase Storage. No se usa el servicio de imágenes de Cloudflare, que es de pago.

---

## Desarrollo local

### 1. Supabase (una sola vez)
1. Crea un proyecto en <https://supabase.com>.
2. En **SQL Editor**, ejecuta **en orden** cada archivo de [`supabase/migrations/`](supabase/migrations/): `0001_init.sql`, `0002_fix_role_trigger.sql`, …
3. En **Authentication → URL Configuration**:
   - **Site URL:** `https://sheday.mx` (o `http://localhost:3000` mientras desarrollas).
   - **Redirect URLs:** agrega `http://localhost:3000/**` y `https://sheday.mx/**` y `https://www.sheday.mx/**`. Sin esto, los enlaces de confirmación de correo y de recuperar contraseña no funcionan.
4. Opcional: en **Authentication → Sign In / Providers → Email**, desactiva **Confirm email** para que las clientas entren en cuanto se registran.

### 2. Variables de entorno
```bash
cp .env.example .env.local
```
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
Usa solo la llave **publishable**, nunca la *secret*. **Reinicia `npm run dev` después de cambiar `.env.local`.**

### 3. Correr
```bash
npm install
npm run dev        # http://localhost:3000
```

### 4. Volverte administradora
Regístrate en la web y luego, en el SQL Editor, ejecuta:
```sql
update public.profiles set role = 'admin'
 where id = (select id from auth.users where email = 'TU_CORREO');
```
Recarga la página: aparece **Admin** en el menú. En **Admin → Ajustes**, guarda el WhatsApp de la tienda y el % de anticipo.

---

## Despliegue en Cloudflare (gratis)

Cloudflare compila el proyecto en sus servidores cada vez que haces push a GitHub.

1. **Sube el repo a GitHub.**
2. En <https://dash.cloudflare.com>, ve a **Workers & Pages → Create → Import a repository** y elige el repo.
   - **Build command:** `npx opennextjs-cloudflare build`
   - **Deploy command:** `npx wrangler deploy`
   - El nombre del Worker debe coincidir con `"name"` en `wrangler.jsonc` (hoy: `sheday`).
3. En **Settings → Variables and Secrets** del Worker, agrega como **variables de build** (Build variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` = `https://sheday.mx`
   - `NODE_VERSION` = `22`, si el build se queja de la versión de Node.

   Las variables `NEXT_PUBLIC_*` se incrustan al compilar: si las cambias, vuelve a desplegar.
4. **Dominio `sheday.mx`:**
   1. En Cloudflare, ve a **Add a domain**, escribe `sheday.mx` y elige el plan **Free**. Cloudflare te dará 2 *nameservers*.
   2. En el panel de tu registrador (donde compraste el `.mx`), reemplaza los nameservers por los de Cloudflare. El cambio puede tardar de unos minutos a 24 horas; Cloudflare te avisa por correo cuando el dominio está activo.
   3. En el Worker, ve a **Settings → Domains & Routes → Add → Custom domain** y agrega `sheday.mx` y luego `www.sheday.mx`. Cloudflare crea los registros DNS y el certificado SSL.
   4. Para que `www` redirija al dominio principal, ve a **sheday.mx → Rules → Redirect Rules → Create rule → plantilla "Redirect from WWW to root"**. Así todos los enlaces quedan como `https://sheday.mx/...`, que es mejor para el SEO.
   5. Si el dominio tiene correo configurado, por ejemplo en Google Workspace, revisa que Cloudflare haya importado sus registros MX antes de cambiar los nameservers.
5. Actualiza la **Site URL** y las **Redirect URLs** en Supabase con tu dominio (paso 3 de la sección de Supabase).

Para probar localmente con el runtime de Cloudflare: `npm run preview` (http://localhost:8787). En Windows funciona, aunque OpenNext no lo garantiza oficialmente.

### Límites del plan gratis de Workers
- 100,000 peticiones al día, de sobra para una tienda local.
- Tamaño del Worker: 3 MiB comprimido. Hoy pesa unos 2.1 MiB.
- 10 ms de CPU por petición. El tiempo esperando a Supabase no cuenta, pero si alguna página llegara a fallar con el error **1102** (límite de CPU), el plan **Workers Paid** cuesta **$5 USD al mes** y lo elimina.

---

## Cómo funciona

### Flujo de la clienta
1. Ve el catálogo **sin registrarse**, con búsqueda y filtros: Entrega inmediata, Sobre pedido y categoría.
2. En el producto elige talla, color y cantidad. Puede **Comprar** (va directo al carrito), **Agregar al carrito** o **Preguntar por WhatsApp**.
3. Para confirmar, inicia sesión o se registra. Puede recuperar su contraseña por correo.
4. Confirma: el servidor valida precios y existencias y descuenta el stock.
5. Ve "¡Pedido recibido!" y un botón de WhatsApp con el resumen del pedido ya escrito.
6. En **Pedidos** sigue el estado. Puede **cancelar** mientras el pedido siga *Pendiente*.

### Administración (`/admin`)
- **Resumen:** pedidos pendientes y productos con poco stock (2 o menos).
- **Pedidos:** filtro por estado. En el detalle cambias el estado, escribes a la clienta por WhatsApp, la llamas y guardas notas internas. Al cancelar, el stock se regresa solo.
- **Productos:** fotos desde la galería o la cámara del celular (se comprimen solas; la primera es la portada y se reordenan con flechas), precio, categoría, modalidad, visible/oculto, y tallas, colores y stock.
- **Categorías** y **Ajustes** (WhatsApp, % de anticipo, aviso de entrega).

---

## Estructura

```
supabase/migrations/          Esquema, RPCs, RLS, bucket y seed (aplicar en orden)
src/
  app/
    layout.tsx                Layout raíz: AuthProvider, Toasts, header y barra inferior (celular)
    page.tsx                  Catálogo (servidor) con filtros por URL (?q=&modo=&cat=)
    producto/[slug]/          Detalle (servidor): metadatos OG, JSON-LD y redirección a la URL canónica
    carrito/ checkout/ pedidos/ cuenta/          Cliente (navegador)
    login/ registro/ recuperar/ restablecer/     Autenticación
    admin/                    Panel (layout con RequireAdmin)
    icon.tsx apple-icon.tsx manifest.ts opengraph-image.tsx robots.ts sitemap.ts
  components/                 ui.tsx, site-nav, guards, auth-provider, toast, product-*, order-parts
  lib/                        env, supabase/{browser,public}, queries, types, format, images, cart, whatsapp, errors
wrangler.jsonc, open-next.config.ts   Configuración de Cloudflare
```

## Base de datos (resumen)

| Tabla | Para qué |
|---|---|
| `profiles` | Datos de la usuaria y `role` (`customer` / `admin`). Se crea sola al registrarse. |
| `store_settings` | Una sola fila: WhatsApp, % de anticipo, aviso de entrega. |
| `categories` | Categorías del catálogo. |
| `products` | Nombre, precio, modalidad (`stock` / `preorder`), visible. |
| `product_images` | Fotos (ruta en el bucket `product-images`), ordenadas. |
| `product_variants` | Talla, color y stock por combinación. |
| `orders` / `order_items` | Pedido con copia de nombre, precio y talla al momento de comprar. Los números empiezan en #1001. |

Funciones (RPC): `place_order`, `cancel_my_order`, `admin_set_order_status`, `delete_my_account`. Los pedidos **solo** se crean y cambian a través de ellas.

---

## Comandos

```bash
npm run dev          # desarrollo (http://localhost:3000)
npm run build        # build de Next.js
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm run preview      # build + runtime de Cloudflare local (http://localhost:8787)
npm run deploy       # build + deploy manual a Cloudflare (requiere `npx wrangler login`)
```

## Pendientes / ideas
- Logo y paleta definitivos. El ícono actual es una "S" provisional generada en `src/lib/brand-mark.tsx`.
- Notificaciones (por ejemplo, avisos por WhatsApp o web push).
- Reportes de ventas en el admin.
- Al ocultar o borrar un producto, avisar si está en pedidos activos.
