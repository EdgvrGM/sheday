# Sheday: qué hace falta para que todo funcione

Lista de lo que se configura **fuera del código** (Supabase, Meta, Cloudflare), en el orden en que hay que hacerlo.
Marca cada casilla al terminar. Última revisión: 26 nov 2026.

> **Cada push a `main` despliega a producción** (Cloudflare Workers Builds).
> Si un paso dice "antes del deploy", hazlo antes de hacer push.

---

## Estado actual

| Pieza | Estado |
|---|---|
| Migraciones 0001 a 0008 | ✅ Aplicadas |
| Login nuevo (celular + código por WhatsApp) | ⚠️ Desplegado, pero **no funciona** hasta terminar §2 (la tienda aún no es pública) |
| Turnstile (anti-bots) | 💤 Listo en el código, apagado |
| Dominio `sheday.mx` | 💤 Sin comprar |

---

## 1. Migraciones de la base de datos

Se ejecutan a mano en Supabase → **SQL Editor**, en orden. Copia el archivo completo y dale *Run*.

- [x] `0001_init.sql`: esquema, RLS, RPC de pedidos y bucket de fotos.
- [x] `0002_fix_role_trigger.sql`: permite asignar el primer admin.
- [x] `0003_phone_login.sql`: celular único por cuenta.
- [x] `0004_phone_auth.sql`: el celular pasa a ser el usuario de Supabase Auth.
- [x] `0005_image_thumbs.sql`: columna `thumb_path` (miniaturas de 480 px).
- [x] `0006_admin_save_product.sql`: RPC `admin_save_product` (guardar producto en una transacción).
- [x] `0007_product_size_guide.sql`: columna `products.size_guide` y `admin_save_product` que la guarda (26 nov 2026).
- [x] `0008_image_colors.sql` (26 nov 2026): columna `product_images.color`, `admin_save_product` que la guarda y `place_order` que guarda en el pedido la foto del color elegido. Se puede ejecutar antes o después del deploy; mientras no se ejecute, los colores de las fotos no se guardan.
- [ ] `0009` (todavía no existe): endurecimiento de seguridad. Se escribe y se ejecuta **después** de terminar §2.

Para comprobar qué está aplicado:

```sql
select
  exists (select 1 from pg_proc where proname = 'sync_profile_phone')   as "0004",
  exists (select 1 from information_schema.columns
          where table_name = 'product_images' and column_name = 'thumb_path') as "0005",
  exists (select 1 from pg_proc where proname = 'admin_save_product')   as "0006",
  exists (select 1 from information_schema.columns
          where table_name = 'products' and column_name = 'size_guide') as "0007",
  exists (select 1 from information_schema.columns
          where table_name = 'product_images' and column_name = 'color') as "0008";
```

---

## 2. Códigos por WhatsApp (registro, login y recuperar contraseña)

Supabase genera el código y llama a nuestro hook `/api/auth/send-sms`, que lo manda por la API de WhatsApp de Meta.
**Hasta completar esta sección, en producción no se puede crear cuenta ni entrar con celular** (sí con correo, para las cuentas que tienen uno).

### 2.1 Meta (WhatsApp Business)
- [ ] Portafolio de negocio y app en [developers.facebook.com](https://developers.facebook.com) con el producto **WhatsApp**.
- [ ] Número remitente agregado y verificado.
- [ ] Plantilla **`sheday_codigo`**: categoría *Autenticación*, botón **"Copiar código"**, idioma **es_MX**, vencimiento de 10 minutos. Espera a que Meta la apruebe.
- [ ] **Token permanente** de un *usuario del sistema* con los permisos `whatsapp_business_messaging` y `whatsapp_business_management`.
- [ ] Anota el **Phone Number ID** (WhatsApp → Configuración de la API).

### 2.2 Cloudflare (Worker `sheday` → Settings → Variables and Secrets, tipo **Secret**)
- [ ] `WHATSAPP_TOKEN`: el token permanente.
- [ ] `WHATSAPP_PHONE_NUMBER_ID`: el id del número remitente.
- [ ] `SEND_SMS_HOOK_SECRET`: lo genera Supabase en el paso 2.3 (empieza con `v1,whsec_`).
- Opcionales (ya tienen valor por defecto): `WHATSAPP_TEMPLATE` (`sheday_codigo`), `WHATSAPP_TEMPLATE_LANG` (`es_MX`) y `WHATSAPP_API_VERSION` (`v23.0`).

### 2.3 Supabase → Authentication
- [ ] **Auth Hooks → Send SMS**: tipo HTTPS, URL `https://sheday.sheday.workers.dev/api/auth/send-sms` (luego `https://sheday.mx/...`). Copia el secreto que genera y guárdalo en Cloudflare como `SEND_SMS_HOOK_SECRET`.
- [ ] **Providers → Phone**: activado, con **"Enable phone confirmations"**. El proveedor de SMS (Twilio, etc.) se queda sin llenar: el hook lo reemplaza.
- [ ] **Vencimiento del código (OTP expiry)**: 600 segundos.
- [ ] **Rate Limits**: revisa el tope de SMS por hora. Cada código cuesta dinero en Meta.

### 2.4 Probar
- [ ] Crea una cuenta con tu celular en `/registro`: debe llegarte el código por WhatsApp.
- [ ] Entra con celular y contraseña en `/login`.
- [ ] Recupera la contraseña por WhatsApp en `/recuperar`.
- [ ] Cambia el celular en `/cuenta`: el código debe llegar al número **nuevo**.
- Si algo falla: Cloudflare → Worker → **Logs** (busca `send-sms:`) y Supabase → **Logs → Auth**.

### 2.5 Después de probar
- [ ] En el SQL Editor: `drop function public.auth_email_for_phone(text);` (era del login anterior).
- [ ] Borra el secreto `SUPABASE_SECRET_KEY` de Cloudflare: ya no se usa.

---

## 3. Turnstile (anti-bots), opcional pero recomendado

Evita que un bot pida miles de códigos por WhatsApp (cada uno se cobra). El código ya está listo; sin la llave no hace nada.
**Respeta el orden:** si activas el captcha en Supabase antes de desplegar la llave, nadie podrá entrar.

- [ ] Cloudflare → **Turnstile → Add widget**, modo *Managed*, con los dominios `sheday.sheday.workers.dev`, `localhost` y `sheday.mx`.
- [ ] Cloudflare → Worker → Settings → **Build variables**: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = la *site key*. También en tu `.env.local`.
- [ ] Haz push y espera a que se despliegue.
- [ ] **Ya desplegado:** Supabase → Authentication → **Attack Protection → Enable Captcha protection → Turnstile**, con la *secret key*.
- [ ] Prueba el login y el registro.

---

## 4. Dominio `sheday.mx` (cuando lo compres)

- [ ] Cloudflare → **Add a domain** (plan Free).
- [ ] En el registrador del .mx, pon los *nameservers* de Cloudflare.
- [ ] Worker → **Custom domains**: `sheday.mx` y `www.sheday.mx`.
- [ ] **Redirect Rule** de `www` a `sheday.mx`.
- [ ] Supabase → Authentication → URL Configuration: Site URL `https://sheday.mx` y Redirect URLs `https://sheday.mx/**`.
- [ ] Supabase → Send SMS hook: cambia la URL a `https://sheday.mx/api/auth/send-sms`.
- [ ] Turnstile: confirma que `sheday.mx` está en los dominios del widget.
- [ ] Opcional: desactiva la URL de workers.dev.

---

## 5. Antes de abrir la tienda al público

- [ ] Sección 2 completa y probada.
- [ ] Catálogo real cargado y producto de prueba ("Mono pelon") borrado.
- [ ] **Ajustes** del admin: WhatsApp de la tienda, % de anticipo y aviso de entrega.
- [ ] Guarda cada producto una vez en el admin para que se generen las miniaturas de sus fotos (las subidas antes de la 0005 no tienen).
- [ ] Recomendado: sección 3 (Turnstile).
- [ ] Haz un pedido de prueba completo: bolsa → checkout → WhatsApp → cambiar estados en el admin → cancelar.

---

## Referencia: variables de entorno

| Variable | Dónde | Tipo |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` y Cloudflare | Build variable |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local` y Cloudflare | Build variable |
| `NEXT_PUBLIC_SITE_URL` | `.env.local` (`http://localhost:3000`), Cloudflare (`https://sheday.mx`) | Build variable |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `.env.local` y Cloudflare (opcional) | Build variable |
| `NODE_VERSION=22` | Cloudflare | Build variable |
| `SEND_SMS_HOOK_SECRET` | `.env.local` y Cloudflare | Secret de runtime |
| `WHATSAPP_TOKEN` | `.env.local` y Cloudflare | Secret de runtime |
| `WHATSAPP_PHONE_NUMBER_ID` | `.env.local` y Cloudflare | Secret de runtime |

Las `NEXT_PUBLIC_*` se incrustan al compilar: si las cambias, hay que volver a desplegar.
Plantilla completa en `.env.example`.
