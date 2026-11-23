# Sheday

App de pedidos para la reventa local de ropa (principalmente de mujer). Las clientas ven el catálogo, arman su carrito y confirman su pedido. El seguimiento se hace por WhatsApp, y la entrega y el pago son en efectivo. **No hay pasarela de pago.**

- **Android, iPhone y web** con el mismo código (Expo / React Native).
- **Panel de administración** dentro de la misma app (pestaña *Admin*), que también funciona en el navegador de la computadora en modo local.
- **Dos modalidades de producto:**
  - **En stock (entrega inmediata):** el inventario se descuenta al confirmar el pedido.
  - **Sobre pedido:** no descuenta stock y calcula un **anticipo** (porcentaje configurable).

---

## Stack

| Capa | Tecnología |
|---|---|
| App | Expo SDK 58, React Native 0.88, React 19.3, TypeScript, Expo Router (rutas por archivos en `src/app/`) |
| Backend | Supabase: Postgres, Auth (correo y contraseña), Storage (fotos), RLS |
| Sesión y carrito | `localStorage` (en iOS/Android lo provee `expo-sqlite/localStorage`) |
| Imágenes | `expo-image`, `expo-image-picker` |
| Íconos | `@expo/vector-icons` (Ionicons) |

---

## Puesta en marcha

### 1. Crear el proyecto en Supabase

1. Crea un proyecto gratuito en <https://supabase.com>.
2. Abre **SQL Editor** y ejecuta, **en orden**, cada archivo de [`supabase/migrations/`](supabase/migrations/) (`0001_init.sql`, `0002_fix_role_trigger.sql`, …). Eso crea las tablas, las funciones, las políticas de seguridad, el bucket de fotos y las categorías iniciales.
3. En **Authentication → Sign In / Providers → Email**, decide si quieres pedir confirmación por correo:
   - **Desactivada:** la clienta entra en cuando se registra. Es lo más práctico en un pueblo.
   - **Activada:** la app le avisa que revise su correo antes de iniciar sesión.

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Llena `.env.local` con los valores de **Project Settings → API Keys / Data API**:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

> Usa solo la llave **publishable** (pública), nunca la *secret / service_role*. La seguridad depende de las políticas RLS.

### 3. Instalar y correr

```bash
npm install
npm run web        # panel/admin en el navegador: http://localhost:8081
npm start          # QR para abrir en el celular
```

En el celular, después de `npm start`, escanea el QR. `expo-sqlite` y `expo-image-picker` vienen incluidos en Expo Go, así que no hace falta un *development build* para empezar.

### 4. Volverte administradora

1. Regístrate desde la app con tu correo.
2. En Supabase → SQL Editor, ejecuta:
   ```sql
   update public.profiles set role = 'admin'
    where id = (select id from auth.users where email = 'TU_CORREO');
   ```
3. Cierra sesión y vuelve a entrar. Aparece la pestaña **Admin**.
4. En **Admin → Ajustes**, guarda el **número de WhatsApp de la tienda** (sin él, el botón de seguimiento no funciona) y el **% de anticipo**.

---

## Cómo funciona

### Flujo de la clienta
1. Ve el catálogo **sin registrarse**, con búsqueda y filtros (*Entrega inmediata* / *Sobre pedido* / categoría).
2. En el producto elige talla, color y cantidad, y lo agrega al carrito. El carrito se guarda en el dispositivo.
3. Para confirmar, inicia sesión o se registra con nombre, celular y dirección.
4. Confirma el pedido: el servidor valida precios y existencias y descuenta el stock.
5. Ve **"¡Pedido recibido!"** y un botón que abre **WhatsApp** con el resumen del pedido ya escrito, dirigido a la tienda.
6. En **Mis pedidos** sigue el estado: Pendiente → Confirmado → (Pedido al proveedor) → En camino → Entregado.
7. Puede **cancelar** mientras el pedido siga *Pendiente*. Las piezas vuelven al inventario.

### Flujo de administración (pestaña *Admin*)
- **Resumen:** pedidos pendientes y productos con poco stock (2 piezas o menos).
- **Pedidos:** filtro por estado. En el detalle puedes cambiar el estado, escribirle a la clienta por WhatsApp y guardar notas internas. Al cancelar, el stock se regresa solo.
- **Productos:** crear y editar con fotos (galería o cámara; la primera es la portada), precio, categoría, modalidad, días estimados (sobre pedido), visible/oculto, y variantes de talla, color y stock (con botones rápidos XS–XL).
- **Categorías:** agregar, renombrar, reordenar y eliminar.
- **Ajustes:** WhatsApp de la tienda, % de anticipo y aviso de entrega.

### Usar el admin desde la computadora (local)
```bash
npm run web
```
Abre <http://localhost:8081> e inicia sesión con tu cuenta admin. Es la misma app, así que no hay nada aparte que desplegar.

---

## Estructura del proyecto

```
supabase/migrations/0001_init.sql   Esquema, funciones RPC, RLS, bucket y datos iniciales
src/
  app/                              Rutas (Expo Router: cada archivo es una pantalla)
    _layout.tsx                     Providers + Stack con rutas protegidas
    (tabs)/                         Pestañas: index (tienda), cart, orders, account, admin
    product/[id].tsx                Detalle de producto
    checkout.tsx                    Confirmar pedido            (requiere sesión)
    order/[id].tsx                  Detalle/seguimiento         (requiere sesión)
    login.tsx, register.tsx         Autenticación (modales)
    admin/                          product/[id], order/[id], settings, categories (solo admin)
  components/                       UI reutilizable (ui.tsx, product-card, order-card, order-summary)
  constants/theme.ts                Colores, espaciados, tema de navegación
  lib/                              supabase, queries, types, format, images, whatsapp, dialog, use-async
  providers/                        auth.tsx (sesión/perfil/rol), cart.tsx (carrito persistente)
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

Funciones (RPC): `place_order`, `cancel_my_order`, `admin_set_order_status`, `delete_my_account`. Los pedidos **solo** se crean y cambian a través de ellas, para que el precio y el stock no dependan de lo que mande el celular.

---

## Comandos

```bash
npm run web            # correr en navegador
npm start              # servidor de desarrollo (QR para el celular)
npx tsc --noEmit       # typecheck
npx expo lint          # lint
npx expo install <pkg> # instalar dependencias compatibles con el SDK
npx expo-doctor        # diagnosticar configuración
```

## Publicar en las tiendas (cuando estés lista)

1. Cambia `ios.bundleIdentifier` / `android.package` en `app.json` (hoy: `com.sheday.app`) por uno tuyo y único.
2. Reemplaza los íconos y el splash en `assets/images/`, que todavía son los de la plantilla de Expo.
3. Compila con EAS: `npx eas-cli@latest build --platform android` (o `ios`).
4. Cuentas: Google Play cobra unos $25 USD una sola vez; Apple, $99 USD al año.
5. Apple pide borrar la cuenta desde la app: ya está en *Cuenta → Eliminar mi cuenta*.

## Pendientes / ideas

- Íconos, splash y logo propios de Sheday.
- Notificaciones push (nuevas llegadas, cambios de estado del pedido).
- Reportes de ventas para el admin.
- Al ocultar o borrar un producto, avisar si está en pedidos activos.
