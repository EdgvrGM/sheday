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
| Backend | Supabase: Postgres, Auth (inicio de sesión con celular + contraseña; correo verificado para recuperación), Storage (fotos), RLS |
| Hosting | Cloudflare Workers (plan gratis) con el adaptador `@opennextjs/cloudflare` |


## Cómo funciona

### Flujo de la clienta
1. Ve el catálogo **sin registrarse**, con búsqueda y filtros: Entrega inmediata, Sobre pedido y categoría.
2. En el producto elige talla, color y cantidad. Puede **Comprar** (va directo al carrito), **Agregar al carrito** o **Preguntar por WhatsApp**.
3. Para confirmar, inicia sesión con su **celular y contraseña**. Si es nueva, se registra con celular, correo y contraseña, y confirma su correo con el enlace que le llega. Cada celular solo puede tener una cuenta. Si olvida la contraseña, la recupera sola por correo.
4. Confirma: el servidor valida precios y existencias y descuenta el stock.
5. Ve "¡Pedido recibido!" y un botón de WhatsApp con el resumen del pedido ya escrito.
6. En **Pedidos** sigue el estado. Puede **cancelar** mientras el pedido siga *Pendiente*.

### Administración (`/admin`)
- **Resumen:** pedidos pendientes y productos con poco stock (2 o menos).
- **Pedidos:** filtro por estado. En el detalle cambias el estado, escribes a la clienta por WhatsApp, la llamas y guardas notas internas. Al cancelar, el stock se regresa solo.
- **Productos:** fotos desde la galería o la cámara del celular (se comprimen solas; la primera es la portada y se reordenan con flechas), precio, categoría, modalidad, visible/oculto, y tallas, colores y stock.
- **Categorías** y **Ajustes** (WhatsApp, % de anticipo, aviso de entrega).

---

## Pendientes / ideas
- Logo y paleta definitivos. El ícono actual es una "S" provisional generada en `src/lib/brand-mark.tsx`.
- Notificaciones (por ejemplo, avisos por WhatsApp o web push).
- Reportes de ventas en el admin.
- Al ocultar o borrar un producto, avisar si está en pedidos activos.
